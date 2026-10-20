import { Check, Compass, MapPin, ScrollText } from 'lucide-react'
import { LEGACY_QUEST } from '@/data/quests'
import { getIsland } from '@/data/islands'
import { legacyProgress } from '@/game/quest/legacy'
import { useGameStore } from '@/store/game-store'

export interface LegacyPanelProps {
  /** Close the journal when the player chooses to travel. */
  onClose?: () => void
}

/**
 * The Legacy campaign view inside the journal.
 *
 * Progress is derived from discoveries, so this panel can never disagree with
 * the per-island counters. The current step carries a direct travel action,
 * which is what makes the campaign cross-island without adding a separate map.
 */
export function LegacyPanel({ onClose }: LegacyPanelProps) {
  const discoveriesByIsland = useGameStore((state) => state.discoveriesByIsland)
  const activeIslandId = useGameStore((state) => state.activeIslandId)
  const setActiveIsland = useGameStore((state) => state.setActiveIsland)

  const progress = legacyProgress(discoveriesByIsland)
  const currentIsland = progress.current ? getIsland(progress.current.islandId) : null
  const atCurrentIsland = currentIsland?.id === activeIslandId

  return (
    <section
      aria-labelledby="legacy-heading"
      data-testid="legacy-panel"
      className="rounded-panel border border-forest/20 bg-cream/55 p-4"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-forest text-cream"
        >
          <ScrollText size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="legacy-heading" className="font-display text-base font-bold text-deep">
              {LEGACY_QUEST.name}
            </h3>
            <span className="font-mono text-xs font-semibold text-muted tabular-nums">
              {progress.completed}/{progress.total}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted">{LEGACY_QUEST.tagline}</p>
        </div>
      </div>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-forest/15"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.completed}
        aria-label="Legacy progress"
      >
        <div
          className="h-full rounded-full bg-leaf transition-[width] duration-500"
          style={{ width: `${(progress.completed / progress.total) * 100}%` }}
        />
      </div>

      <ol className="mt-4 space-y-2">
        {LEGACY_QUEST.steps.map((step, index) => {
          const done = index < progress.stepIndex
          const current = index === progress.stepIndex
          const island = getIsland(step.islandId)

          return (
            <li
              key={step.id}
              aria-current={current ? 'step' : undefined}
              className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 ${
                current
                  ? 'border-leaf/50 bg-sun/25'
                  : done
                    ? 'border-forest/15 bg-leaf/10'
                    : 'border-forest/10 bg-cream/40'
              }`}
            >
              <span aria-hidden="true" className="mt-0.5 shrink-0">
                {done ? (
                  <Check size={15} className="text-forest" />
                ) : current ? (
                  <Compass size={15} className="text-forest" />
                ) : (
                  <MapPin size={15} className="text-muted" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${done ? 'text-forest' : 'text-deep'}`}>
                  {step.title}
                </p>
                <p className="text-xs text-muted">
                  {island.name}
                  {done ? ' · Complete' : current ? ' · Next' : ''}
                </p>
                {current ? <p className="mt-1 text-sm text-muted">{step.hint}</p> : null}
              </div>
            </li>
          )
        })}
      </ol>

      {progress.complete ? (
        <p className="mt-3 rounded-xl bg-leaf/15 px-3 py-2 text-sm font-semibold text-forest">
          Legacy complete. The three islands remember who lit the first fire.
        </p>
      ) : currentIsland ? (
        <button
          type="button"
          onClick={() => {
            setActiveIsland(currentIsland.id)
            onClose?.()
          }}
          disabled={atCurrentIsland}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-forest px-4 py-2 text-sm font-semibold text-cream transition hover:bg-leaf active:scale-95 disabled:cursor-default disabled:bg-forest/35 disabled:active:scale-100"
        >
          <MapPin size={15} aria-hidden="true" />
          {atCurrentIsland ? `You are on ${currentIsland.name}` : `Travel to ${currentIsland.name}`}
        </button>
      ) : null}
    </section>
  )
}
