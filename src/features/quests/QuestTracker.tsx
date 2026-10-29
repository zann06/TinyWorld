import { Compass, MapPin, Trophy } from 'lucide-react'
import { getObjectById } from '@/data/objects'
import { getIsland } from '@/data/islands'
import { currentObjective } from '@/game/quest/objective'
import { LEGACY_QUEST } from '@/data/quests'
import { useActiveIsland, useGameStore } from '@/store/game-store'

/**
 * The always-visible objective card.
 *
 * Shows the current Legacy step — what to do, where it is — without opening
 * the journal. When the step lives on another island, it offers direct travel,
 * which is what makes the cross-island campaign readable at a glance.
 */
export function QuestTracker() {
  const discoveriesByIsland = useGameStore((s) => s.discoveriesByIsland)
  const activeIslandId = useGameStore((s) => s.activeIslandId)
  const setActiveIsland = useGameStore((s) => s.setActiveIsland)
  const activeIsland = useActiveIsland()

  const objective = currentObjective(discoveriesByIsland)

  if (!objective) {
    return (
      <aside
        data-testid="quest-tracker"
        aria-label="Current objective"
        className="pointer-events-auto absolute top-[4.6rem] left-3 z-20 max-w-[15rem] sm:top-[4.75rem] sm:left-4 sm:max-w-xs"
      >
        <div className="tw-panel rounded-2xl p-3">
          <div className="flex items-start gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-leaf text-cream"
            >
              <Trophy size={15} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                Campaign complete
              </p>
              <p className="font-display text-sm leading-snug font-bold text-deep">
                {LEGACY_QUEST.name} — every mark found
              </p>
              <p className="mt-0.5 text-xs text-muted">
                The three islands remember who lit the first fire.
              </p>
            </div>
          </div>
        </div>
      </aside>
    )
  }

  const objectiveIsland = getIsland(objective.islandId)
  const onObjectiveIsland = objectiveIsland.id === activeIslandId
  const target = getObjectById(
    onObjectiveIsland ? activeIsland : objectiveIsland,
    objective.objectId,
  )

  return (
    <aside
      data-testid="quest-tracker"
      aria-label="Current objective"
      className="pointer-events-auto absolute top-[4.6rem] left-3 z-20 max-w-[15rem] sm:top-[4.75rem] sm:left-4 sm:max-w-xs"
    >
      <div className="tw-panel rounded-2xl p-3">
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-forest text-cream"
          >
            <Compass size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
              Objective · {LEGACY_QUEST.name}
            </p>
            <p
              data-testid="quest-tracker-title"
              className="font-display text-sm leading-snug font-bold text-deep"
            >
              {objective.title}
            </p>
          </div>
        </div>

        <p data-testid="quest-tracker-hint" className="mt-1.5 text-xs leading-snug text-muted">
          {objective.hint}
        </p>

        {target ? (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-deep">
            <MapPin size={12} aria-hidden="true" className="shrink-0 text-forest" />
            {target.name} · {objectiveIsland.name}
          </p>
        ) : null}

        {!onObjectiveIsland ? (
          <button
            type="button"
            data-testid="quest-tracker-travel"
            onClick={() => setActiveIsland(objectiveIsland.id)}
            className="mt-2 w-full rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-leaf active:scale-95"
          >
            Travel to {objectiveIsland.name}
          </button>
        ) : null}
      </div>
    </aside>
  )
}
