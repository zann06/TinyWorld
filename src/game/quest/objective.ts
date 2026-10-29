import type { Vec2 } from '@/types'
import { legacyProgress, type DiscoveriesByIsland } from '@/game/quest/legacy'

/**
 * The explorer's current objective.
 *
 * A thin, serialisable view of the active Legacy step: everything the HUD,
 * the compass and the in-world beacon need, and nothing that would leak
 * quest internals into the UI layer.
 */
export interface ObjectiveTarget {
  /** Stable step id, e.g. `legacy-first-mark`. */
  stepId: string
  /** Short objective title, e.g. "The First Mark". */
  title: string
  /** What the explorer should actually do. */
  hint: string
  /** Island that hosts the objective. */
  islandId: string
  /** The landmark that completes the step. */
  objectId: string
}

/**
 * The step the explorer should be working on right now, or null once the
 * campaign is complete. Derived from discoveries, so it can never disagree
 * with the journal or the island counters.
 */
export function currentObjective(discoveries: DiscoveriesByIsland): ObjectiveTarget | null {
  const step = legacyProgress(discoveries).current
  if (!step) return null
  return {
    stepId: step.id,
    title: step.title,
    hint: step.hint,
    islandId: step.islandId,
    objectId: step.objectId,
  }
}

/** Planar distance from the explorer to the objective, in world units. */
export function objectiveDistance(from: Vec2, to: Vec2): number {
  return Math.hypot(to.x - from.x, to.z - from.z)
}

/**
 * Signed bearing to the objective relative to the camera, in radians.
 *
 * `0` is straight ahead, positive is to the right of the screen, negative is
 * to the left — the same screen-space basis the movement code uses, where the
 * view direction is `(sin yaw, cos yaw)` and screen right is
 * `(-cos yaw, sin yaw)`. Feed the result straight into a CSS `rotate()` on an
 * up-pointing arrow and it points where the explorer should walk.
 */
export function objectiveBearing(from: Vec2, yaw: number, to: Vec2): number {
  const dx = to.x - from.x
  const dz = to.z - from.z

  const sin = Math.sin(yaw)
  const cos = Math.cos(yaw)
  const forward = dx * sin + dz * cos
  const right = dx * -cos + dz * sin

  return Math.atan2(right, forward)
}
