import { useEffect, useId, useRef, useState } from 'react'
import { Check, Map } from 'lucide-react'
import { ISLANDS, getIsland } from '@/data/islands'
import { islandDiscoverableCount } from '@/data/objects'
import { useGameStore } from '@/store/game-store'

/**
 * Island switcher.
 *
 * A button and a listbox rather than a `<select>`, so each entry can carry the
 * discovery count. Escape closes it and focus returns to the trigger; clicking
 * outside closes it too.
 */
export function IslandSwitcher() {
  const activeIslandId = useGameStore((state) => state.activeIslandId)
  const discoveriesByIsland = useGameStore((state) => state.discoveriesByIsland)
  const setActiveIsland = useGameStore((state) => state.setActiveIsland)

  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listId = useId()

  const island = getIsland(activeIslandId)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const choose = (islandId: string): void => {
    setActiveIsland(islandId)
    setOpen(false)
    // Focus follows the selection back to the trigger, so a keyboard user is
    // never left on a button that no longer exists.
    triggerRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="listbox"
        data-testid="island-switcher"
        className="tw-panel flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-deep transition hover:bg-sun/40 active:scale-95"
      >
        <Map size={14} aria-hidden="true" />
        <span className="max-w-28 truncate">{island.name}</span>
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Choose an island"
          data-testid="island-switcher-list"
          className="tw-panel absolute right-0 z-40 mt-2 w-72 overflow-hidden p-1 shadow-lift"
        >
          {ISLANDS.map((entry) => {
            const discovered = discoveriesByIsland[entry.id]?.length ?? 0
            const total = islandDiscoverableCount(entry)
            const isCurrent = entry.id === activeIslandId

            return (
              <li key={entry.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isCurrent}
                  onClick={() => choose(entry.id)}
                  className="flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition hover:bg-forest/10 aria-selected:bg-sun/25"
                >
                  <span className="mt-0.5 w-4 shrink-0" aria-hidden="true">
                    {isCurrent ? <Check size={14} className="text-forest" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-deep">{entry.name}</span>
                    <span className="block text-xs leading-snug text-muted">{entry.blurb}</span>
                    <span className="mt-1 block font-mono text-[11px] text-muted tabular-nums">
                      {discovered}/{total} discovered
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
