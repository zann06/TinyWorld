import { STORY_FRAGMENTS, type StoryFragment, type StoryRequirement } from '@/data/story'
import { getIsland } from '@/data/islands'
import { legacyProgress, type DiscoveriesByIsland } from '@/game/quest/legacy'

/**
 * Story unlocking, derived entirely from discoveries.
 *
 * Like the Legacy progress itself, the story has no persisted state of its
 * own: a fragment is "unlocked" exactly when the discoveries that reveal it
 * exist, so the journal can never drift from the save file.
 */

/** All collectible ids on one island, the milestone denominator. */
function collectibleIds(islandId: string): string[] {
  return getIsland(islandId)
    .objects.filter((object) => object.category === 'collectible' && object.discoverable)
    .map((object) => object.id)
}

/** True when every collectible on the island has been found. */
export function allKeepsakesFound(islandId: string, discoveries: DiscoveriesByIsland): boolean {
  const ids = collectibleIds(islandId)
  if (ids.length === 0) return false

  const found = new Set((discoveries[islandId] ?? []).map((entry) => entry.id))
  return ids.every((id) => found.has(id))
}

/** Is this one fragment revealed by the current discoveries? */
export function isFragmentUnlocked(
  fragment: StoryFragment,
  discoveries: DiscoveriesByIsland,
  completedStepIds: ReadonlySet<string>,
  campaignComplete: boolean,
): boolean {
  const requirement: StoryRequirement = fragment.requirement

  switch (requirement.kind) {
    case 'always':
      return true
    case 'step':
      return completedStepIds.has(requirement.stepId)
    case 'keepsakes':
      return allKeepsakesFound(requirement.islandId, discoveries)
    case 'campaign-complete':
      return campaignComplete
  }
}

export interface StoryState {
  /** Fragments the journal may show, in reading order. */
  unlocked: readonly StoryFragment[]
  /** Ids of the unlocked fragments, for cheap before/after comparisons. */
  unlockedIds: ReadonlySet<string>
  unlockedCount: number
  total: number
  /** True when every fragment — including the epilogue — is unlocked. */
  complete: boolean
}

/** Derive the full story state from the persisted discoveries. */
export function storyState(discoveries: DiscoveriesByIsland): StoryState {
  const progress = legacyProgress(discoveries)
  const completedStepIds = new Set(progress.completedStepIds)

  const unlocked = STORY_FRAGMENTS.filter((fragment) =>
    isFragmentUnlocked(fragment, discoveries, completedStepIds, progress.complete),
  )

  return {
    unlocked,
    unlockedIds: new Set(unlocked.map((fragment) => fragment.id)),
    unlockedCount: unlocked.length,
    total: STORY_FRAGMENTS.length,
    complete: unlocked.length === STORY_FRAGMENTS.length,
  }
}
