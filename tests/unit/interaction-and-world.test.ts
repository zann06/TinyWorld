import { beforeEach, describe, expect, it } from 'vitest'
import { promptLabel, resolveInteraction } from '@/game/interaction/interaction'
import { WORLD_OBJECTS } from '@/data/objects'
import { findObjectsWithoutVisual } from '@/world/objects/visual-registry'
import {
  terrainHeight,
  isOnLand,
  seededRandom,
  scatterInCluster,
  terrainSlope,
} from '@/world/terrain/terrain'
import { OBSTACLES, PATH_POINTS, coastlineRadiusAt } from '@/data/world'

/** Well beyond any part of the island, guaranteed to be open water. */
const ISLAND_FAR = 400

describe('resolveInteraction', () => {
  it('resolves every interactable object to a real outcome', () => {
    for (const object of WORLD_OBJECTS.filter((entry) => entry.interactable)) {
      const outcome = resolveInteraction(object.id)
      expect(outcome).not.toBeNull()
      expect(outcome?.message.length).toBeGreaterThan(20)
      expect(outcome?.title.length).toBeGreaterThan(0)
    }
  })

  it('returns null for an unknown object', () => {
    expect(resolveInteraction('not-a-landmark')).toBeNull()
  })

  it('records discovery for discoverable objects', () => {
    expect(resolveInteraction('lighthouse')?.discovers).toBe(true)
  })

  it('maps interaction categories to meaningful kinds', () => {
    expect(resolveInteraction('boardwalk')?.kind).toBe('read-board')
    expect(resolveInteraction('garden')?.kind).toBe('discover')
    expect(resolveInteraction('cottage')?.kind).toBe('inspect')
  })

  it('applies a world effect for objects that change the world', () => {
    expect(resolveInteraction('watchtower')?.effect).toBe('light-lantern')
    expect(resolveInteraction('camp')?.effect).toBe('stoke-fire')
  })

  it('produces unique outcomes so no two landmarks behave identically', () => {
    const ids = WORLD_OBJECTS.map((object) => resolveInteraction(object.id)?.message)
    expect(new Set(ids).size).toBe(WORLD_OBJECTS.length)
  })
})

describe('promptLabel', () => {
  it('returns the action label for an interactable object', () => {
    expect(promptLabel('lighthouse')).toBe('Climb the spiral stair')
  })

  it('returns null for nothing or a non-interactable object', () => {
    expect(promptLabel(null)).toBeNull()
    expect(promptLabel('missing')).toBeNull()
  })
})

describe('visual registry', () => {
  it('has a rendered visual for every declared world object', () => {
    expect(findObjectsWithoutVisual(WORLD_OBJECTS)).toEqual([])
  })
})

describe('terrain', () => {
  it('is deterministic — the same coordinate always returns the same height', () => {
    expect(terrainHeight(12.5, -7.25)).toBe(terrainHeight(12.5, -7.25))
  })

  it('is elevated in the middle of the island and low at the shore', () => {
    expect(terrainHeight(0, 0)).toBeGreaterThan(terrainHeight(46, 0))
  })

  it('drops below the waterline outside the shoreline', () => {
    expect(terrainHeight(ISLAND_FAR, 0)).toBeLessThan(0)
  })

  it('classifies land and water correctly', () => {
    expect(isOnLand(0, 0)).toBe(true)
    expect(isOnLand(ISLAND_FAR, 0)).toBe(false)
  })

  it('places every landmark on land', () => {
    for (const obstacle of OBSTACLES) {
      expect(isOnLand(obstacle.x, obstacle.z)).toBe(true)
    }
  })

  it('places every footpath vertex on land', () => {
    for (const point of PATH_POINTS) {
      expect(isOnLand(point.x, point.z)).toBe(true)
    }
  })

  it('produces varied ground: flat beaches and rolling highland', () => {
    const high = terrainHeight(-2, -8)
    const beach = terrainHeight(coastlineRadiusAt(-40, 10) * 0.99, 0)

    expect(high).toBeGreaterThan(5)
    expect(beach).toBeLessThan(1.5)
    expect(Math.abs(terrainSlope(0, 0) - terrainSlope(20, 14))).toBeGreaterThan(0.01)
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
})

describe('scatterInCluster', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('scatters the requested number of points when the area is clear', () => {
    const points = scatterInCluster({ x: 0, z: 0 }, 20, 30, seededRandom(3), [])
    expect(points).toHaveLength(30)
  })

  it('never places a point inside a blocked radius', () => {
    const blocked = [{ x: 0, z: 0, radius: 8 }]
    const points = scatterInCluster({ x: 0, z: 0 }, 20, 40, seededRandom(3), blocked)

    for (const point of points) {
      expect(Math.hypot(point.x, point.z)).toBeGreaterThan(8 + 1.4)
    }
  })

  it('only scatters points that are on dry land', () => {
    const points = scatterInCluster({ x: 0, z: 0 }, 80, 60, seededRandom(11), [])
    for (const point of points) {
      expect(isOnLand(point.x, point.z)).toBe(true)
    }
  })

  it('skips slopes steeper than the given limit', () => {
    const steep = scatterInCluster({ x: 0, z: 0 }, 80, 60, seededRandom(5), [], { maxSlope: 0 })
    expect(steep).toHaveLength(0)
  })
})
