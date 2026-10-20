import type { DiscoveryEntry } from '@/types'
import { LEGACY_QUEST, type QuestStep } from '@/data/quests'

export type DiscoveriesByIsland = Readonly<Record<string, readonly DiscoveryEntry[]>>

export interface LegacyProgress {
  /** Index of the next step, or `steps.length` when complete. */
  stepIndex: number
  /** Sequential steps finished. Out-of-order discoveries do not count yet. */
  completed: number
  total: number
  complete: boolean
  /** Next step to complete, or null when the campaign is finished. */
  current: QuestStep | null
  /** Step just completed, useful for the advancement toast. */
  lastCompleted: QuestStep | null
}

function isStepFound(step: QuestStep, discoveries: DiscoveriesByIsland): boolean {
  return (discoveries[step.islandId] ?? []).some((entry) => entry.id === step.objectId)
}

/**
 * Derive Legacy progress from the persisted discovery lists.
 *
 * Steps are sequential, so a landmark discovered early is remembered but only
 * counts once every earlier step is complete. That keeps the story readable
 * without adding a second persisted quest state.
 */
export function legacyProgress(discoveries: DiscoveriesByIsland): LegacyProgress {
  const steps = LEGACY_QUEST.steps
  let stepIndex = 0

  while (stepIndex < steps.length) {
    const step = steps[stepIndex]
    if (!step || !isStepFound(step, discoveries)) break
    stepIndex += 1
  }

  return {
    stepIndex,
    completed: stepIndex,
    total: steps.length,
    complete: stepIndex === steps.length,
    current: steps[stepIndex] ?? null,
    lastCompleted: stepIndex > 0 ? (steps[stepIndex - 1] ?? null) : null,
  }
}
