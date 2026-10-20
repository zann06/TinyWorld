import { describe, expect, it } from 'vitest'
import { LEGACY_QUEST } from '@/data/quests'
import { getIsland } from '@/data/islands'
import { getObjectById } from '@/data/objects'
import { legacyProgress, type DiscoveriesByIsland } from '@/game/quest/legacy'
import type { DiscoveryEntry } from '@/types'

function discovered(...ids: string[]): DiscoveryEntry[] {
  return ids.map((id, index) => ({ id, discoveredAt: index + 1 }))
}

function progressWith(entries: DiscoveriesByIsland) {
  return legacyProgress(entries)
}

describe('Legacy quest definition', () => {
  it('references a discoverable landmark on the named island for every step', () => {
    for (const step of LEGACY_QUEST.steps) {
      const island = getIsland(step.islandId)
      expect(island.id, step.id).toBe(step.islandId)

      const object = getObjectById(island, step.objectId)
      expect(object, `${step.id} -> ${step.objectId}`).toBeDefined()
      expect(object?.discoverable, step.id).toBe(true)
    }
  })

  it('touches all three islands and ends on Hearthfall', () => {
    const islandIds = new Set(LEGACY_QUEST.steps.map((step) => step.islandId))
    expect(islandIds).toEqual(new Set(['greenhaven', 'cairnmoor', 'hearthfall']))
    expect(LEGACY_QUEST.steps.at(-1)?.islandId).toBe('hearthfall')
  })
})

describe('legacyProgress', () => {
  it('starts at the first step with no discoveries', () => {
    const progress = progressWith({})
    expect(progress.stepIndex).toBe(0)
    expect(progress.completed).toBe(0)
    expect(progress.complete).toBe(false)
    expect(progress.current?.id).toBe('legacy-first-mark')
  })

  it('advances one step at a time in order', () => {
    const afterFirst = progressWith({ greenhaven: discovered('boardwalk') })
    expect(afterFirst.stepIndex).toBe(1)
    expect(afterFirst.current?.id).toBe('legacy-watchers')
    expect(afterFirst.lastCompleted?.id).toBe('legacy-first-mark')

    const afterSecond = progressWith({
      greenhaven: discovered('boardwalk'),
      cairnmoor: discovered('cairn'),
    })
    expect(afterSecond.stepIndex).toBe(2)
    expect(afterSecond.current?.id).toBe('legacy-first-fire')
  })

  it('remembers out-of-order discoveries but does not skip ahead', () => {
    const progress = progressWith({
      greenhaven: discovered('boardwalk'),
      hearthfall: discovered('first-hearth', 'record-wall'),
    })

    expect(progress.stepIndex).toBe(1)
    expect(progress.current?.id).toBe('legacy-watchers')
  })

  it('completes after the final bell', () => {
    const progress = progressWith({
      greenhaven: discovered('boardwalk'),
      cairnmoor: discovered('cairn'),
      hearthfall: discovered('first-hearth', 'record-wall', 'tide-bell'),
    })

    expect(progress.complete).toBe(true)
    expect(progress.completed).toBe(progress.total)
    expect(progress.current).toBeNull()
    expect(progress.lastCompleted?.id).toBe('legacy-bell')
  })
})
