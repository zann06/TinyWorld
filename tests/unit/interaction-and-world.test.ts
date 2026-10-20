import { describe, expect, it } from 'vitest'
import { promptLabel, resolveInteraction } from '@/game/interaction/interaction'
import { ISLANDS, getIsland } from '@/data/islands'
import { findObjectsWithoutVisual } from '@/world/objects/visual-registry'
import { createTerrain, scatterInCluster, seededRandom } from '@/world/terrain/terrain'

const GREENHAVEN = getIsland('greenhaven')
const greenhaven = createTerrain(GREENHAVEN)

/** Well beyond any part of an island, guaranteed to be open water. */
const ISLAND_FAR = 400

describe.each(ISLANDS.map((island) => [island.name, island] as const))(
  '%s interactions',
  (_name, island) => {
    it('resolves every interactable object to a real outcome', () => {
      for (const object of island.objects.filter((entry) => entry.interactable)) {
        const outcome = resolveInteraction(island, object.id)
        expect(outcome, object.id).not.toBeNull()
        expect(outcome?.message.length ?? 0, object.id).toBeGreaterThan(20)
        expect(outcome?.title.length ?? 0, object.id).toBeGreaterThan(0)
      }
    })

    it('returns null for an unknown object', () => {
      expect(resolveInteraction(island, 'not-a-landmark')).toBeNull()
    })

    it("does not resolve another island's landmark", () => {
      for (const other of ISLANDS) {
        if (other.id === island.id) continue
        for (const object of other.objects) {
          expect(resolveInteraction(island, object.id), object.id).toBeNull()
        }
      }
    })

    it('returns the action label for an interactable object', () => {
      for (const object of island.objects.filter((entry) => entry.interactable)) {
        expect(promptLabel(island, object.id), object.id).toBe(
          object.actionLabel ?? `Explore ${object.name}`,
        )
      }
    })

    it('returns null for nothing or an unknown object', () => {
      expect(promptLabel(island, null)).toBeNull()
      expect(promptLabel(island, 'missing')).toBeNull()
    })

    it('produces unique outcomes so no two landmarks behave identically', () => {
      const messages = island.objects.map(
        (object) => resolveInteraction(island, object.id)?.message,
      )
      expect(new Set(messages).size).toBe(island.objects.length)
    })
  },
)

describe('interaction categories and effects', () => {
  it('records discovery for discoverable objects', () => {
    expect(resolveInteraction(GREENHAVEN, 'lighthouse')?.discovers).toBe(true)
  })

  it('maps interaction categories to meaningful kinds', () => {
    expect(resolveInteraction(GREENHAVEN, 'boardwalk')?.kind).toBe('read-board')
    expect(resolveInteraction(GREENHAVEN, 'garden')?.kind).toBe('discover')
    expect(resolveInteraction(GREENHAVEN, 'cottage')?.kind).toBe('inspect')
  })

  it('applies a world effect for objects that change the world', () => {
    expect(resolveInteraction(GREENHAVEN, 'watchtower')?.effect).toBe('light-lantern')
    expect(resolveInteraction(GREENHAVEN, 'camp')?.effect).toBe('stoke-fire')
  })

  it('gives Cairnmoor its own fire and water effects', () => {
    const cairnmoor = getIsland('cairnmoor')
    expect(resolveInteraction(cairnmoor, 'drift-camp')?.effect).toBe('stoke-fire')
    expect(resolveInteraction(cairnmoor, 'cold-seep')?.effect).toBe('splash-spring')
  })
})

describe('visual registry', () => {
  it.each(ISLANDS.map((island) => [island.name, island] as const))(
    'has a rendered visual for every %s object',
    (_name, island) => {
      expect(findObjectsWithoutVisual(island.objects)).toEqual([])
    },
  )
})

describe.each(ISLANDS.map((island) => [island.name, island] as const))(
  '%s terrain',
  (_name, island) => {
    const terrain = createTerrain(island)

    it('is deterministic — the same coordinate always returns the same height', () => {
      expect(terrain.height(12.5, -7.25)).toBe(terrain.height(12.5, -7.25))
    })

    it('is elevated in the middle of the island and low at the shore', () => {
      expect(terrain.height(0, 0)).toBeGreaterThan(terrain.height(island.radius, 0))
    })

    it('drops below the waterline outside the shoreline', () => {
      expect(terrain.height(ISLAND_FAR, 0)).toBeLessThan(0)
    })

    it('classifies land and water correctly', () => {
      expect(terrain.isOnLand(0, 0)).toBe(true)
      expect(terrain.isOnLand(ISLAND_FAR, 0)).toBe(false)
    })

    it('places every landmark on land', () => {
      for (const obstacle of island.obstacles) {
        expect(terrain.isOnLand(obstacle.x, obstacle.z), obstacle.id).toBe(true)
      }
    })

    it('places every footpath vertex on land', () => {
      for (const point of island.path) {
        expect(terrain.isOnLand(point.x, point.z), `${point.x},${point.z}`).toBe(true)
      }
    })

    it('reuses built geometry when the island is visited again', () => {
      const first = createTerrain(island).buildGeometry(8)
      const revisited = createTerrain(island).buildGeometry(8)

      expect(revisited).toBe(first)
      expect(createTerrain(island).buildGeometry(9)).not.toBe(first)
    })

    it('produces varied ground: flat beaches and rolling highland', () => {
      const high = terrain.height(-2, -8)
      const beach = terrain.height(terrain.coastRadiusAt(-40, 10) * 0.99, 0)

      expect(high).toBeGreaterThan(5)
      // Each island has its own shore depth — Cairnmoor is deliberately the
      // steeper, rockier one — so the beach is bounded by its own ramp, not a
      // fixed number.
      expect(beach).toBeLessThan(island.shape.shoreDepth)
      expect(beach).toBeLessThan(high / 2)
      expect(Math.abs(terrain.slope(0, 0) - terrain.slope(20, 14))).toBeGreaterThan(0.01)
    })
  },
)

describe('island terrain differs', () => {
  it('gives each island a genuinely different height field', () => {
    const cairnmoor = createTerrain(getIsland('cairnmoor'))

    expect(cairnmoor.height(12.5, -7.25)).not.toBe(greenhaven.height(12.5, -7.25))
    expect(cairnmoor.height(0, 0)).not.toBeCloseTo(greenhaven.height(0, 0), 3)
  })

  it('gives each island a different coastline', () => {
    const cairnmoor = createTerrain(getIsland('cairnmoor'))
    expect(cairnmoor.coastRadiusAt(30, -18)).not.toBeCloseTo(greenhaven.coastRadiusAt(30, -18), 3)
  })
})

describe('seededRandom', () => {
  it('produces a repeatable sequence', () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    const first = [a(), a(), a()]
    const second = [b(), b(), b()]
    expect(first).toEqual(second)
  })

  it('produces values inside [0, 1)', () => {
    const rand = seededRandom(7)
    for (let i = 0; i < 50; i += 1) {
      const value = rand()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('differs between seeds', () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)())
  })

  it('differs between islands, so scatter is not copy-pasted', () => {
    const cairnmoor = createTerrain(getIsland('cairnmoor'))
    const cluster = { x: 0, z: 0, count: 8, radius: 10 }

    const a = scatterInCluster(greenhaven, cluster, 8, seededRandom(GREENHAVEN.seed), [])
    const b = scatterInCluster(cairnmoor, cluster, 8, seededRandom(getIsland('cairnmoor').seed), [])

    expect(a).not.toEqual(b)
  })
})

describe('scatterInCluster', () => {
  it('scatters the requested number of points when the area is clear', () => {
    const points = scatterInCluster(
      greenhaven,
      { x: 0, z: 0, count: 30, radius: 20 },
      30,
      seededRandom(3),
      [],
    )
    expect(points).toHaveLength(30)
  })

  it('never places a point inside a blocked radius', () => {
    const blocked = [{ x: 0, z: 0, radius: 8 }]
    const points = scatterInCluster(
      greenhaven,
      { x: 0, z: 0, count: 40, radius: 20 },
      40,
      seededRandom(3),
      blocked,
    )

    for (const point of points) {
      expect(Math.hypot(point.x, point.z)).toBeGreaterThan(8 + 1.4)
    }
  })

  it('only scatters points that are on dry land', () => {
    const points = scatterInCluster(
      greenhaven,
      { x: 0, z: 0, count: 60, radius: 80 },
      60,
      seededRandom(11),
      [],
    )
    for (const point of points) {
      expect(greenhaven.isOnLand(point.x, point.z)).toBe(true)
    }
  })

  it('skips slopes steeper than the given limit', () => {
    const steep = scatterInCluster(
      greenhaven,
      { x: 0, z: 0, count: 60, radius: 80 },
      60,
      seededRandom(5),
      [],
      { maxSlope: 0 },
    )
    expect(steep).toHaveLength(0)
  })
})
