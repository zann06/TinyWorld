import { useMemo, useState } from 'react'
import { Compass, MapPin, Search } from 'lucide-react'
import { CATEGORY_LABELS, islandDiscoverableCount } from '@/data/objects'
import { useActiveDiscoveries, useActiveIsland, useGameStore } from '@/store/game-store'
import { summariseProgress } from '@/game/discovery/discovery'
import type { WorldObjectDef } from '@/types'

export interface ObjectDirectoryProps {
  headingLevel?: 2 | 3
  /** `dark` renders for the WebGL-unavailable fallback screen. */
  tone?: 'light' | 'dark'
  className?: string
}

type Filter = 'all' | 'found' | 'missing'

/**
 * Accessible DOM directory of every landmark on the current island.
 *
 * This is the non-3D route to the whole world: it is the primary interaction
 * path when WebGL is unavailable, and a keyboard-friendly alternative to
 * raycasting for everyone else.
 */
export function ObjectDirectory({
  headingLevel = 2,
  tone = 'light',
  className = '',
}: ObjectDirectoryProps) {
  const island = useActiveIsland()
  const discoveries = useActiveDiscoveries()
  const select = useGameStore((state) => state.select)
  const selectedId = useGameStore((state) => state.selectedId)
  const interact = useGameStore((state) => state.interact)

  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const foundIds = useMemo(() => new Set(discoveries.map((entry) => entry.id)), [discoveries])
  const { found, total } = summariseProgress(discoveries, islandDiscoverableCount(island))

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return island.objects.filter((object) => {
      if (filter === 'found' && !foundIds.has(object.id)) return false
      if (filter === 'missing' && foundIds.has(object.id)) return false
      if (needle.length === 0) return true
      return (
        object.name.toLowerCase().includes(needle) ||
        object.summary.toLowerCase().includes(needle) ||
        CATEGORY_LABELS[object.category].toLowerCase().includes(needle)
      )
    })
  }, [filter, query, island.objects, foundIds])

  const dark = tone === 'dark'
  const Heading = headingLevel === 2 ? 'h2' : 'h3'

  return (
    <section
      id="tinyworld-object-directory"
      aria-labelledby="object-directory-heading"
      className={`flex flex-col gap-3 ${className}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Heading
            id="object-directory-heading"
            className={`font-display text-lg font-bold ${dark ? 'text-cream' : 'text-deep'}`}
          >
            Island directory
          </Heading>
          <p
            className={`mt-0.5 text-sm ${dark ? 'text-muted-dark' : 'text-muted'}`}
            aria-live="polite"
          >
            {found} of {total} landmarks discovered
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              size={15}
              aria-hidden="true"
              className={`pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 ${
                dark ? 'text-muted-dark' : 'text-muted'
              }`}
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search landmarks"
              aria-label="Search landmarks"
              className={`w-44 rounded-full border py-2 pr-3 pl-8 text-sm outline-none ${
                dark
                  ? 'border-cream/25 bg-deep/50 text-cream placeholder:text-muted-dark'
                  : 'border-forest/25 bg-cream/70 text-deep placeholder:text-muted'
              }`}
            />
          </div>

          <div
            className={`flex rounded-full border p-0.5 ${
              dark ? 'border-cream/25' : 'border-forest/25'
            }`}
            role="group"
            aria-label="Filter landmarks by discovery"
          >
            {(
              [
                ['all', 'All'],
                ['found', 'Found'],
                ['missing', 'Missing'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filter === value
                    ? 'bg-forest text-cream'
                    : dark
                      ? 'text-muted-dark hover:bg-cream/10'
                      : 'text-muted hover:bg-forest/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <p
          className={`rounded-panel border border-dashed px-4 py-8 text-center text-sm ${
            dark ? 'border-cream/25 text-muted-dark' : 'border-forest/25 text-muted'
          }`}
        >
          {filter === 'missing' && found === total
            ? 'Every landmark has been discovered. Reset progress in Settings to explore again.'
            : 'No landmarks match your search.'}
        </p>
      ) : (
        <ul className={`grid gap-2 sm:grid-cols-2 ${dark ? '' : ''}`}>
          {visible.map((object) => (
            <DirectoryCard
              key={object.id}
              object={object}
              found={foundIds.has(object.id)}
              selected={selectedId === object.id}
              dark={dark}
              onSelect={() => select(object.id)}
              onInteract={() => interact(object.id)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

interface DirectoryCardProps {
  object: WorldObjectDef
  found: boolean
  selected: boolean
  dark: boolean
  onSelect: () => void
  onInteract: () => void
}

function DirectoryCard({
  object,
  found,
  selected,
  dark,
  onSelect,
  onInteract,
}: DirectoryCardProps) {
  const status = found ? 'Discovered' : 'Not yet discovered'

  return (
    <li
      className={`rounded-panel border p-3 transition ${
        dark
          ? `border-cream/15 bg-deep/45 ${selected ? 'ring-2 ring-sun' : ''}`
          : `border-forest/15 bg-cream/60 ${selected ? 'ring-2 ring-leaf' : ''}`
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`grid size-9 shrink-0 place-items-center rounded-full ${
            found
              ? dark
                ? 'bg-leaf/25 text-leaf-soft'
                : 'bg-leaf/20 text-forest'
              : dark
                ? 'bg-cream/10 text-muted-dark'
                : 'bg-forest/10 text-deep/45'
          }`}
        >
          {found ? <Compass size={17} /> : <MapPin size={17} />}
        </span>

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${dark ? 'text-cream' : 'text-deep'}`}>{object.name}</p>
          <p className={`text-xs ${dark ? 'text-muted-dark' : 'text-muted'}`}>
            {CATEGORY_LABELS[object.category]} · {status}
          </p>
          <p className={`mt-1.5 text-sm ${dark ? 'text-muted-dark' : 'text-muted'}`}>
            {found ? object.description : object.summary}
          </p>

          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSelect}
              aria-pressed={selected}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                dark
                  ? 'bg-cream/15 text-cream hover:bg-cream/25'
                  : 'border border-forest/25 text-deep hover:bg-forest/10'
              }`}
            >
              {selected ? 'Selected in world' : 'Select in world'}
            </button>
            {object.interactable ? (
              <button
                type="button"
                onClick={onInteract}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                  dark
                    ? 'bg-leaf/25 text-leaf-soft hover:bg-leaf/35'
                    : 'bg-forest text-cream hover:bg-leaf'
                }`}
              >
                {object.actionLabel ?? 'Explore'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  )
}
