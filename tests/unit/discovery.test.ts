import { describe, expect, it } from 'vitest'
import {
  addDiscovery,
  clearDiscoveries,
  discoveredIds,
  hasDiscovered,
  summariseProgress,
} from '@/game/discovery/discovery'
import { discoverableIds } from '@/game/interaction/interaction'
import { ISLANDS, TOTAL_DISCOVERABLE, getIsland, islandOfObjectId } from '@/data/islands'
import {
  KNOWN_OBJECT_IDS,
  getObjectById,
  islandDiscoverableCount,
  islandObjectIds,
} from '@/data/objects'
import type { WorldObjectDef } from '@/types'

/** First entry of a non-empty list, with a clear failure if it is empty. */
function firstOf(objects: readonly WorldObjectDef[]): WorldObjectDef {
  const first = objects.at(0)
  if (!first) throw new Error('Expected at least one object')
  return first
}

const GREENHAVEN = getIsland('greenhaven')

describe('summariseProgress', () => {
  it('reports zero progress with no discoveries', () => {
    expect(summariseProgress([], TOTAL_DISCOVERABLE)).toEqual({
      found: 0,
      total: TOTAL_DISCOVERABLE,
      ratio: 0,
    })
  })

  it('computes a ratio from the discovery count', () => {
    const entries = GREENHAVEN.objects.slice(0, 5).map((object, index) => ({
      id: object.id,
      discoveredAt: index,
    }))

    const total = islandDiscoverableCount(GREENHAVEN)
    const summary = summariseProgress(entries, total)
    expect(summary.found).toBe(5)
    expect(summary.ratio).toBeCloseTo(5 / total, 6)
  })

  it('never exceeds a ratio of 1 even with duplicate entries', () => {
    // Deliberately feeds the island's discoveries in twice, with the island's
    // own total as the denominator: the ratio must still clamp at 1.
    const total = islandDiscoverableCount(GREENHAVEN)
    const once = GREENHAVEN.objects.map((object) => ({ id: object.id, discoveredAt: 1 }))
    const doubled = [...once, ...once]

    expect(summariseProgress(doubled, total).ratio).toBe(1)
  })

  it('handles a zero total without dividing by zero', () => {
    expect(summariseProgress([], 0).ratio).toBe(0)
  })

  it('ignores discoveries of objects that no longer exist', () => {
    const summary = summariseProgress(
      [
        { id: 'lighthouse', discoveredAt: 1 },
        { id: 'deleted-landmark', discoveredAt: 2 },
      ],
      TOTAL_DISCOVERABLE,
    )
    expect(summary.found).toBe(1)
  })
})

describe('addDiscovery', () => {
  it('records a first discovery', () => {
    const result = addDiscovery([], 'lighthouse', 1000)
    expect(result.isNew).toBe(true)
    expect(result.discoveries).toEqual([{ id: 'lighthouse', discoveredAt: 1000 }])
  })

  it('does not inflate progress for a repeated discovery', () => {
    const first = addDiscovery([], 'lighthouse', 1000)
    const second = addDiscovery(first.discoveries, 'lighthouse', 2000)

    expect(second.isNew).toBe(false)
    expect(second.discoveries).toHaveLength(1)
    expect(second.discoveries).toBe(first.discoveries)
  })

  it('rejects unknown object IDs', () => {
    const result = addDiscovery([], 'not-a-real-landmark')
    expect(result.isNew).toBe(false)
    expect(result.discoveries).toHaveLength(0)
  })

  it('accumulates multiple discoveries in order', () => {
    let entries = addDiscovery([], 'lighthouse', 1).discoveries
    entries = addDiscovery(entries, 'cottage', 2).discoveries

    expect(entries.map((entry) => entry.id)).toEqual(['lighthouse', 'cottage'])
  })
})

describe('discovery helpers', () => {
  it('hasDiscovered reflects membership', () => {
    const entries = [{ id: 'lighthouse', discoveredAt: 1 }]
    expect(hasDiscovered(entries, 'lighthouse')).toBe(true)
    expect(hasDiscovered(entries, 'cottage')).toBe(false)
  })

  it('discoveredIds returns a Set of ids', () => {
    expect(discoveredIds([{ id: 'cottage', discoveredAt: 1 }])).toEqual(new Set(['cottage']))
  })

  it('clearDiscoveries returns a fresh empty array', () => {
    expect(clearDiscoveries()).toEqual([])
  })

  it('discoverableIds covers every discoverable object on every island', () => {
    expect(discoverableIds()).toHaveLength(TOTAL_DISCOVERABLE)
  })
})

describe.each(ISLANDS.map((island) => [island.name, island] as const))(
  '%s data integrity',
  (_name, island) => {
    it('has unique object IDs', () => {
      const ids = island.objects.map((object) => object.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('meets the design target of at least 8 landmarks', () => {
      expect(island.objects.length).toBeGreaterThanOrEqual(8)
    })

    it('gives every object a name, summary, description and category', () => {
      for (const object of island.objects) {
        expect(object.name.length).toBeGreaterThan(0)
        expect(object.summary.length).toBeGreaterThan(10)
        expect(object.description.length).toBeGreaterThan(40)
        expect(object.category.length).toBeGreaterThan(0)
      }
    })

    it('gives every interactable object an action label', () => {
      for (const object of island.objects.filter((entry) => entry.interactable)) {
        expect(object.actionLabel).toBeTruthy()
      }
    })

    it('resolves known IDs and rejects unknown ones', () => {
      expect(getObjectById(island, firstOf(island.objects).id)?.id).toBe(firstOf(island.objects).id)
      expect(getObjectById(island, 'nope')).toBeUndefined()
    })

    it('never resolves an object from another island', () => {
      for (const other of ISLANDS) {
        if (other.id === island.id) continue
        for (const object of other.objects) {
          expect(
            getObjectById(island, object.id),
            `${island.name} must not resolve ${other.name}'s "${object.id}"`,
          ).toBeUndefined()
        }
      }
    })

    it('exposes a non-empty island ID set', () => {
      expect(islandObjectIds(island).size).toBe(island.objects.length)
    })

    it('spawns the explorer away from every obstacle', () => {
      for (const obstacle of island.obstacles) {
        const distance = Math.hypot(island.spawn.x - obstacle.x, island.spawn.z - obstacle.z)
        expect(distance).toBeGreaterThan(obstacle.radius + 1.15)
      }
    })
  },
)

describe('island registry', () => {
  it('gives every island a unique id', () => {
    const ids = ISLANDS.map((island) => island.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never lets two islands claim the same object id', () => {
    const owners = new Map<string, string>()
    for (const island of ISLANDS) {
      for (const object of island.objects) {
        expect(owners.has(object.id), `"${object.id}" is claimed twice`).toBe(false)
        owners.set(object.id, island.id)
      }
    }
  })

  it('maps every object id back to exactly one island', () => {
    for (const island of ISLANDS) {
      for (const object of island.objects) {
        expect(islandOfObjectId(object.id)).toBe(island.id)
      }
    }
    expect(islandOfObjectId('nope')).toBeNull()
  })

  it('exposes every island object in the known-ID set', () => {
    const expected = ISLANDS.reduce((total, island) => total + island.objects.length, 0)
    expect(KNOWN_OBJECT_IDS.size).toBe(expected)
  })
})
