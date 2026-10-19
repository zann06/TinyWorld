import { describe, expect, it } from 'vitest'
import {
  addDiscovery,
  clearDiscoveries,
  discoveredIds,
  discoverableIds,
  hasDiscovered,
  summariseProgress,
} from '@/game/discovery/discovery'
import { KNOWN_OBJECT_IDS, TOTAL_DISCOVERABLE, WORLD_OBJECTS, getObjectById } from '@/data/objects'

describe('summariseProgress', () => {
  it('reports zero progress with no discoveries', () => {
    expect(summariseProgress([], TOTAL_DISCOVERABLE)).toEqual({
      found: 0,
      total: TOTAL_DISCOVERABLE,
      ratio: 0,
    })
  })

  it('computes a ratio from the discovery count', () => {
    const entries = WORLD_OBJECTS.slice(0, 5).map((object, index) => ({
      id: object.id,
      discoveredAt: index,
    }))

    const summary = summariseProgress(entries, TOTAL_DISCOVERABLE)
    expect(summary.found).toBe(5)
    expect(summary.ratio).toBeCloseTo(5 / TOTAL_DISCOVERABLE, 6)
  })

  it('never exceeds a ratio of 1 even with duplicate entries', () => {
    const entries = WORLD_OBJECTS.map((object) => ({ id: object.id, discoveredAt: 1 }))
    expect(summariseProgress(entries, TOTAL_DISCOVERABLE).ratio).toBe(1)
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

  it('discoverableIds covers every discoverable object', () => {
    expect(discoverableIds()).toHaveLength(TOTAL_DISCOVERABLE)
  })
})

describe('world object data integrity', () => {
  it('has unique object IDs', () => {
    const ids = WORLD_OBJECTS.map((object) => object.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('meets the design target of at least 8 landmarks', () => {
    expect(WORLD_OBJECTS.length).toBeGreaterThanOrEqual(8)
  })

  it('gives every object a name, summary, description and category', () => {
    for (const object of WORLD_OBJECTS) {
      expect(object.name.length).toBeGreaterThan(0)
      expect(object.summary.length).toBeGreaterThan(10)
      expect(object.description.length).toBeGreaterThan(40)
      expect(object.category.length).toBeGreaterThan(0)
    }
  })

  it('gives every interactable object an action label', () => {
    for (const object of WORLD_OBJECTS.filter((entry) => entry.interactable)) {
      expect(object.actionLabel).toBeTruthy()
    }
  })

  it('resolves known IDs and rejects unknown ones', () => {
    expect(getObjectById('lighthouse')?.name).toBe('Northwind Lighthouse')
    expect(getObjectById('nope')).toBeUndefined()
  })

  it('exposes a non-empty known-ID set', () => {
    expect(KNOWN_OBJECT_IDS.size).toBe(WORLD_OBJECTS.length)
  })
})
