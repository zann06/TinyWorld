import { describe, expect, it } from 'vitest'
import { STORY_FRAGMENTS } from '@/data/story'
import { ISLANDS, getIsland } from '@/data/islands'
import { legacyProgress } from '@/game/quest/legacy'
import { allKeepsakesFound, storyState } from '@/game/story/story'
import type { DiscoveryEntry } from '@/types'

const GREENHAVEN_KEEPSAKES = ['whisper-shell', 'sunwick-shard', 'fernway-totem']
const CAIRNMOOR_KEEPSAKES = ['stormcall-shell', 'hullglass-shard', 'wayfarer-totem']
const HEARTHFALL_KEEPSAKES = ['emberwhisper-shell', 'firstlight-shard', 'settlers-totem']

function discovered(...ids: string[]): DiscoveryEntry[] {
  return ids.map((id, index) => ({ id, discoveredAt: index + 1 }))
}

function unlockedIds(entries: DiscoveryEntry[][]): string[] {
  const byIsland: Record<string, DiscoveryEntry[]> = {}
  // Entries are provided per island in ISLANDS order for convenience.
  ISLANDS.forEach((island, index) => {
    byIsland[island.id] = entries[index] ?? []
  })
  return storyState(byIsland).unlocked.map((fragment) => fragment.id)
}

describe('storyState', () => {
  it('starts with only the prologue unlocked', () => {
    const story = storyState({})
    expect(story.unlockedCount).toBe(1)
    expect(story.unlocked[0]?.id).toBe('prologue')
    expect(story.total).toBe(STORY_FRAGMENTS.length)
    expect(story.complete).toBe(false)
  })

  it('follows the reading order of the fragments, not the discovery order', () => {
    // Both Greenhaven entries unlock together, and must appear in trail order.
    const ids = unlockedIds([discovered('boardwalk', ...GREENHAVEN_KEEPSAKES), [], []])
    expect(ids).toEqual(['prologue', 'greenhaven-receipts', 'departure-note'])
  })

  it('unlocks a step fragment when its Legacy step completes', () => {
    const ids = unlockedIds([discovered('boardwalk'), [], []])
    expect(ids).toContain('departure-note')
    expect(ids).not.toContain('the-watchers')
  })

  it('unlocks a milestone when every keep on the island is found', () => {
    const ids = unlockedIds([discovered(...GREENHAVEN_KEEPSAKES), [], []])
    expect(ids).toContain('greenhaven-receipts')

    const partial = unlockedIds([discovered('whisper-shell', 'sunwick-shard'), [], []])
    expect(partial).not.toContain('greenhaven-receipts')
  })

  it('unlocks the epilogue only when the campaign completes', () => {
    const stepsOnly = unlockedIds([
      discovered('boardwalk'),
      discovered('cairn'),
      discovered('first-hearth', 'record-wall', 'tide-bell'),
    ])
    expect(stepsOnly).toContain('trail-finished')
    // ...but the story is not complete while milestones are still locked.
    expect(
      storyState({
        greenhaven: discovered('boardwalk'),
        cairnmoor: discovered('cairn'),
        hearthfall: discovered('first-hearth', 'record-wall', 'tide-bell'),
      }).complete,
    ).toBe(false)
  })

  it('completes when the trail and every milestone are unlocked', () => {
    const story = storyState({
      greenhaven: discovered('boardwalk', ...GREENHAVEN_KEEPSAKES),
      cairnmoor: discovered('cairn', ...CAIRNMOOR_KEEPSAKES),
      hearthfall: discovered('first-hearth', 'record-wall', 'tide-bell', ...HEARTHFALL_KEEPSAKES),
    })
    expect(story.unlockedCount).toBe(story.total)
    expect(story.complete).toBe(true)
    expect(story.unlocked.at(-1)?.id).toBe('trail-finished')
  })

  it('derives completed step ids in trail order on legacy progress', () => {
    const progress = legacyProgress({
      greenhaven: discovered('boardwalk'),
      cairnmoor: discovered('cairn'),
    })
    expect(progress.completedStepIds).toEqual(['legacy-first-mark', 'legacy-watchers'])
    expect(progress.current?.id).toBe('legacy-first-fire')
  })
})

describe('allKeepsakesFound', () => {
  it('requires every collectible on the island', () => {
    expect(
      allKeepsakesFound('greenhaven', { greenhaven: discovered(...GREENHAVEN_KEEPSAKES) }),
    ).toBe(true)
    expect(allKeepsakesFound('greenhaven', { greenhaven: discovered('whisper-shell') })).toBe(false)
    expect(allKeepsakesFound('greenhaven', {})).toBe(false)
  })

  it('is false for an island with no collectibles', () => {
    const empty = ISLANDS.find((island) =>
      getIsland(island.id).objects.every((o) => o.category !== 'collectible'),
    )
    if (empty) {
      expect(allKeepsakesFound(empty.id, { [empty.id]: discovered('anything') })).toBe(false)
    }
  })
})
