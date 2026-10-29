import { describe, expect, it } from 'vitest'
import { currentObjective, objectiveBearing, objectiveDistance } from '@/game/quest/objective'
import type { DiscoveryEntry } from '@/types'

function discovered(...ids: string[]): DiscoveryEntry[] {
  return ids.map((id, index) => ({ id, discoveredAt: index + 1 }))
}

describe('currentObjective', () => {
  it('starts on the first Legacy step with no discoveries', () => {
    const objective = currentObjective({})
    expect(objective).not.toBeNull()
    expect(objective?.stepId).toBe('legacy-first-mark')
    expect(objective?.islandId).toBe('greenhaven')
    expect(objective?.objectId).toBe('boardwalk')
    expect(objective?.title.length).toBeGreaterThan(0)
    expect(objective?.hint.length).toBeGreaterThan(0)
  })

  it('follows the Legacy order as steps complete', () => {
    expect(currentObjective({ greenhaven: discovered('boardwalk') })?.stepId).toBe(
      'legacy-watchers',
    )
    expect(
      currentObjective({
        greenhaven: discovered('boardwalk'),
        cairnmoor: discovered('cairn'),
      })?.stepId,
    ).toBe('legacy-first-fire')
  })

  it('is null once the campaign is complete', () => {
    const objective = currentObjective({
      greenhaven: discovered('boardwalk'),
      cairnmoor: discovered('cairn'),
      hearthfall: discovered('first-hearth', 'record-wall', 'tide-bell'),
    })
    expect(objective).toBeNull()
  })
})

describe('objectiveDistance', () => {
  it('measures planar distance in world units', () => {
    expect(objectiveDistance({ x: 0, z: 0 }, { x: 3, z: 4 })).toBe(5)
    expect(objectiveDistance({ x: 10, z: 10 }, { x: 10, z: 10 })).toBe(0)
  })
})

describe('objectiveBearing', () => {
  // The rig looks along `d = (sin yaw, cos yaw)`, and screen right is
  // `(-cos yaw, sin yaw)` — the same basis the movement code uses.
  it('is zero straight ahead', () => {
    expect(objectiveBearing({ x: 0, z: 0 }, 0, { x: 0, z: 10 })).toBeCloseTo(0, 6)
    expect(objectiveBearing({ x: 0, z: 0 }, Math.PI / 2, { x: 10, z: 0 })).toBeCloseTo(0, 6)
  })

  it('is positive to the screen right and negative to the screen left', () => {
    // At yaw 0 the camera looks along +Z, so world -X is screen right.
    expect(objectiveBearing({ x: 0, z: 0 }, 0, { x: -10, z: 0 })).toBeCloseTo(Math.PI / 2, 6)
    expect(objectiveBearing({ x: 0, z: 0 }, 0, { x: 10, z: 0 })).toBeCloseTo(-Math.PI / 2, 6)
  })

  it('is half a turn behind the explorer', () => {
    const bearing = objectiveBearing({ x: 0, z: 0 }, 0, { x: 0, z: -10 })
    expect(Math.abs(bearing)).toBeCloseTo(Math.PI, 6)
  })

  it('stays relative to the current yaw', () => {
    // Looking along -Z (yaw = PI): a target at world -Z is straight ahead.
    expect(objectiveBearing({ x: 0, z: 0 }, Math.PI, { x: 0, z: -10 })).toBeCloseTo(0, 6)
    // ...and a target at world -X is now screen left.
    expect(objectiveBearing({ x: 0, z: 0 }, Math.PI, { x: -10, z: 0 })).toBeCloseTo(-Math.PI / 2, 6)
  })
})
