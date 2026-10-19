import { describe, expect, it } from 'vitest'
import {
  isPositionWalkable,
  findNearest,
  normaliseInput,
  resolvePosition,
  wrapAngle,
} from '@/game/collision/collision'
import { OBSTACLES, coastlineRadiusAt } from '@/data/world'
import { moveVectorToInput, readMoveVector } from '@/game/input/input'
import type { Obstacle, Vec2 } from '@/types'

type Vec3 = readonly [number, number, number]

/** Cross product, used to rebuild the camera basis for the tests below. */
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

describe('resolvePosition', () => {
  const wall: Obstacle = { id: 'wall', x: 0, z: 0, radius: 2 }

  it('leaves a clear position untouched', () => {
    const result = resolvePosition({ x: 10, z: 10 }, 0.5, [wall])
    expect(result.corrected).toBe(false)
    expect(result.position).toEqual({ x: 10, z: 10 })
  })

  it('pushes the player out of a solid obstacle', () => {
    const result = resolvePosition({ x: 1, z: 0 }, 0.5, [wall])
    expect(result.corrected).toBe(true)
    // Player radius + obstacle radius = 2.5 units of separation.
    expect(Math.hypot(result.position.x, result.position.z)).toBeCloseTo(2.5, 4)
  })

  it('displaces a player standing exactly at an obstacle centre', () => {
    const result = resolvePosition({ x: 0, z: 0 }, 0.5, [wall])
    expect(result.corrected).toBe(true)
    expect(Math.hypot(result.position.x, result.position.z)).toBeGreaterThanOrEqual(2.5)
  })

  it('keeps the player inside the real coastline', () => {
    const result = resolvePosition({ x: 500, z: 500 }, 1, [])
    expect(result.corrected).toBe(true)
    // The clamp must respect the wobbled shoreline, not the nominal radius.
    expect(Math.hypot(result.position.x, result.position.z)).toBeLessThanOrEqual(
      coastlineRadiusAt(result.position.x, result.position.z),
    )
  })

  it('resolves every island landmark position to a walkable spot', () => {
    for (const obstacle of OBSTACLES) {
      const result = resolvePosition({ x: obstacle.x, z: obstacle.z }, 1.15, OBSTACLES)
      expect(Math.hypot(result.position.x, result.position.z)).toBeLessThan(
        coastlineRadiusAt(result.position.x, result.position.z),
      )
    }
  })
})

describe('isPositionWalkable', () => {
  it('is false inside an obstacle and true outside it', () => {
    const wall: Obstacle = { id: 'wall', x: 0, z: 0, radius: 2 }
    expect(isPositionWalkable({ x: 0, z: 0 }, 0.5, [wall])).toBe(false)
    expect(isPositionWalkable({ x: 8, z: 8 }, 0.5, [wall])).toBe(true)
  })
})

describe('findNearest', () => {
  const candidates = [
    { id: 'far', position: { x: 20, z: 0 }, radius: 1 },
    { id: 'near', position: { x: 2, z: 0 }, radius: 1 },
  ]

  it('returns the closest candidate within range', () => {
    expect(findNearest({ x: 0, z: 0 }, candidates, 5)?.id).toBe('near')
  })

  it('returns null when everything is out of range', () => {
    expect(findNearest({ x: 0, z: 0 }, candidates, 0.5)).toBeNull()
  })

  it('accounts for the candidate radius in the reach calculation', () => {
    // Distance 5.5 exceeds maxDistance 5, but the 1-unit radius reaches it.
    const big = [{ id: 'big', position: { x: 5.5, z: 0 }, radius: 1 }]
    expect(findNearest({ x: 0, z: 0 }, big, 5)?.id).toBe('big')
  })

  it('breaks exact ties deterministically by id', () => {
    const tied = [
      { id: 'b', position: { x: 3, z: 0 }, radius: 1 },
      { id: 'a', position: { x: -3, z: 0 }, radius: 1 },
    ]
    expect(findNearest({ x: 0, z: 0 }, tied, 5)?.id).toBe('a')
  })
})

describe('normaliseInput', () => {
  /**
   * Rebuild the camera basis the way `CameraRig` places it and the way
   * three.js `Matrix4.lookAt` orients it:
   *
   *   eye      = focus - (sin yaw, 0, cos yaw) * distance
   *   zCamera  = normalize(eye - target)      (points backwards)
   *   xCamera  = normalize(up x zCamera)     (screen right)
   *   forward  = -zCamera                    (screen forward)
   *
   * Derived independently of `normaliseInput` so mirroring the horizontal axis
   * cannot pass.
   */
  function screenBasis(yaw: number): { right: Vec2; forward: Vec2 } {
    const backward: Vec3 = [-Math.sin(yaw), 0, -Math.cos(yaw)]
    const right = cross([0, 1, 0], backward)
    return {
      right: { x: right[0], z: right[2] },
      forward: { x: -backward[0], z: -backward[2] },
    }
  }

  function dot(a: Vec2, b: Vec2): number {
    return a.x * b.x + a.z * b.z
  }

  it('returns a zero vector for no input', () => {
    expect(normaliseInput({ x: 0, z: 0 }, 0.7)).toEqual({ x: 0, z: 0 })
  })

  it('produces a unit-length direction', () => {
    const result = normaliseInput({ x: 1, z: 1 }, 0)
    expect(Math.hypot(result.x, result.z)).toBeCloseTo(1, 6)
  })

  it('rotates forward input by the camera yaw', () => {
    const result = normaliseInput({ x: 0, z: 1 }, Math.PI / 2)
    expect(result.x).toBeCloseTo(1, 6)
    expect(result.z).toBeCloseTo(0, 6)
  })

  it.each([0, 0.6, Math.PI / 2, 2.4, -1.9, Math.PI])(
    'walks toward the direction the camera faces at yaw %p',
    (yaw) => {
      const { forward } = screenBasis(yaw)
      expect(dot(normaliseInput({ x: 0, z: 1 }, yaw), forward)).toBeCloseTo(1, 6)
      expect(dot(normaliseInput({ x: 0, z: -1 }, yaw), forward)).toBeCloseTo(-1, 6)
    },
  )

  it.each([0, 0.6, Math.PI / 2, 2.4, -1.9, Math.PI])(
    'strafes toward the right of the screen at yaw %p',
    (yaw) => {
      // Regression: right input used to be mirrored, so ArrowRight / D walked
      // to the left of the screen.
      const { right } = screenBasis(yaw)
      expect(dot(normaliseInput({ x: 1, z: 0 }, yaw), right)).toBeCloseTo(1, 6)
      expect(dot(normaliseInput({ x: -1, z: 0 }, yaw), right)).toBeCloseTo(-1, 6)
    },
  )

  it('caps every input at unit length so diagonals are not faster', () => {
    const result = normaliseInput({ x: 1, z: 1 }, 0.6)
    expect(Math.hypot(result.x, result.z)).toBeCloseTo(1, 6)
  })

  it('agrees with moveVectorToInput end to end for every arrow key', () => {
    for (const yaw of [0, 0.6, Math.PI / 2, -1.9]) {
      const { right, forward } = screenBasis(yaw)

      const up = normaliseInput(moveVectorToInput(readMoveVector(['ArrowUp'])), yaw)
      const down = normaliseInput(moveVectorToInput(readMoveVector(['ArrowDown'])), yaw)
      const rightKey = normaliseInput(moveVectorToInput(readMoveVector(['ArrowRight'])), yaw)
      const leftKey = normaliseInput(moveVectorToInput(readMoveVector(['ArrowLeft'])), yaw)

      expect(dot(up, forward)).toBeCloseTo(1, 6)
      expect(dot(down, forward)).toBeCloseTo(-1, 6)
      expect(dot(rightKey, right)).toBeCloseTo(1, 6)
      expect(dot(leftKey, right)).toBeCloseTo(-1, 6)
    }
  })
})

describe('wrapAngle', () => {
  it('keeps angles inside (-PI, PI]', () => {
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 6)
    expect(wrapAngle(-Math.PI * 3)).toBeCloseTo(Math.PI, 6)
    expect(wrapAngle(Math.PI * 5 + 0.5)).toBeLessThanOrEqual(Math.PI)
  })

  it('leaves in-range angles alone', () => {
    expect(wrapAngle(1.2)).toBeCloseTo(1.2, 6)
  })
})
