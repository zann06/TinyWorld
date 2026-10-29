import { useEffect, useMemo, useRef } from 'react'
import { getObjectById } from '@/data/objects'
import { currentObjective, objectiveBearing, objectiveDistance } from '@/game/quest/objective'
import { movementState } from '@/game/input/useKeyboardControls'
import { useActiveIsland, useGameStore } from '@/store/game-store'

/**
 * The objective compass.
 *
 * A small dial whose needle points at the current Legacy target relative to
 * the camera, with the live distance underneath. Updates run in a
 * requestAnimationFrame loop against the mutable movement state — React never
 * re-renders for movement or camera turns.
 *
 * Hidden while the objective sits on another island; the quest tracker's
 * travel button is the right guidance there.
 */
export function ObjectiveCompass() {
  const discoveriesByIsland = useGameStore((s) => s.discoveriesByIsland)
  const activeIslandId = useGameStore((s) => s.activeIslandId)
  const island = useActiveIsland()

  const objective = currentObjective(discoveriesByIsland)

  const target = useMemo(() => {
    if (!objective || objective.islandId !== activeIslandId) return null
    return getObjectById(island, objective.objectId) ?? null
  }, [objective, activeIslandId, island])

  const needleRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)

  // The animation loop reads the target through this effect's closure; the
  // effect restarts whenever the target changes, so the closure stays current.
  useEffect(() => {
    if (!target) return

    let frame = 0
    let lastLabel = ''

    const tick = (): void => {
      frame = requestAnimationFrame(tick)

      const bearing = objectiveBearing(movementState.player, movementState.yaw, target.position)
      if (needleRef.current) {
        needleRef.current.style.transform = `rotate(${bearing.toFixed(3)}rad)`
      }

      const label = `${Math.round(objectiveDistance(movementState.player, target.position))} m`
      if (labelRef.current && label !== lastLabel) {
        labelRef.current.textContent = label
        lastLabel = label
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])

  if (!target || !objective) return null

  return (
    <div
      data-testid="objective-compass"
      aria-label={`Compass pointing to ${target.name}`}
      className="pointer-events-none absolute top-[4.6rem] right-3 z-20 flex flex-col items-center gap-1.5 sm:top-[4.75rem] sm:right-4"
    >
      <div className="relative grid size-16 place-items-center rounded-full border border-forest/25 bg-cream/80 shadow-soft backdrop-blur-sm">
        <span
          aria-hidden="true"
          className="absolute top-1 font-mono text-[8px] leading-none font-bold text-muted"
        >
          N
        </span>

        <div
          ref={needleRef}
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center will-change-transform"
        >
          <svg width="36" height="36" viewBox="0 0 24 24">
            <path d="M12 2 L17.2 15 L12 11.6 L6.8 15 Z" fill="#c1440e" />
            <path d="M12 11.6 L17.2 15 L12 22 L6.8 15 Z" fill="#9a6b3f" />
          </svg>
        </div>

        <span aria-hidden="true" className="absolute size-1.5 rounded-full bg-deep/70" />
      </div>

      <span
        ref={labelRef}
        aria-hidden="true"
        className="tw-panel rounded-full px-2 py-0.5 font-mono text-[10px] font-bold text-deep tabular-nums"
      >
        — m
      </span>

      <span className="sr-only">
        Compass pointing to {target.name} on {island.name}.
      </span>
    </div>
  )
}
