import type { Obstacle, Vec2 } from '@/types'
import { coastlineRadiusAt } from '@/data/world'

/** Keeps the player this far from the island's shoreline. */
export const SHORE_MARGIN = 3.2

/**
 * Clamp a position so it stays on the island and outside every solid obstacle.
 * Returns the corrected position and whether any correction was applied.
 */
export function resolvePosition(
  position: Vec2,
  playerRadius: number,
  obstacles: readonly Obstacle[],
): { position: Vec2; corrected: boolean } {
  let corrected = false

  // 1. Keep the player on the island, following the real (wobbled) coastline.
  const shore = coastlineRadiusAt(position.x, position.z)
  const maxRadius = shore - SHORE_MARGIN - playerRadius
  const distance = Math.hypot(position.x, position.z)

  let nextX = position.x
  let nextZ = position.z

  if (maxRadius > 0 && distance > maxRadius) {
    const scale = maxRadius / distance
    nextX = position.x * scale
    nextZ = position.z * scale
    corrected = true
  }

  // 2. Push the player out of any solid structure, axis by axis.
  for (const obstacle of obstacles) {
    const dx = nextX - obstacle.x
    const dz = nextZ - obstacle.z
    const minDistance = obstacle.radius + playerRadius
    const distSq = dx * dx + dz * dz

    if (distSq < minDistance * minDistance) {
      const dist = Math.sqrt(distSq)
      if (dist > 1e-6) {
        const push = (minDistance - dist) / dist
        nextX += dx * push
        nextZ += dz * push
      } else {
        // Exactly coincident: displace along +X deterministically.
        nextX += minDistance
      }
      corrected = true
    }
  }

  return { position: { x: nextX, z: nextZ }, corrected }
}

/** True when a position is free of obstacles and on the island. */
export function isPositionWalkable(
  position: Vec2,
  playerRadius: number,
  obstacles: readonly Obstacle[],
): boolean {
  const { corrected } = resolvePosition(position, playerRadius, obstacles)
  return !corrected
}

/**
 * Find the closest object within `maxDistance` of a point.
 * Ties are broken by ID so the result is deterministic across frames.
 */
export function findNearest<T extends { id: string; position: Vec2; radius: number }>(
  origin: Vec2,
  candidates: readonly T[],
  maxDistance: number,
): T | null {
  let best: T | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    const dx = candidate.position.x - origin.x
    const dz = candidate.position.z - origin.z
    const distance = Math.hypot(dx, dz)
    const reach = maxDistance + candidate.radius

    if (distance > reach) continue
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    } else if (distance === bestDistance && best !== null && candidate.id < best.id) {
      best = candidate
    }
  }

  return best
}

/** Convert a horizontal input vector into a normalised world-space direction. */
export function normaliseInput(input: Vec2, yaw: number): Vec2 {
  let x = input.x
  let z = input.z
  const length = Math.hypot(x, z)

  if (length < 1e-6) return { x: 0, z: 0 }
  if (length > 1) {
    x /= length
    z /= length
  }

  /*
   * Project the screen-space input onto the camera basis.
   *
   * The rig places the camera at `focus - (sin yaw, 0, cos yaw) * distance`
   * (`CameraRig`), so the view direction is `d = (sin yaw, 0, cos yaw)`.
   * three.js builds the camera basis with `x = up x z`, which makes the
   * on-screen right vector `r = (-cos yaw, 0, sin yaw)` — note the negated
   * cosine. Rotating by yaw as a plain 2D matrix would mirror the horizontal
   * axis and send ArrowRight / D to the left of the screen.
   *
   * world = inputX * r + inputZ * d
   */
  const sin = Math.sin(yaw)
  const cos = Math.cos(yaw)
  return { x: -x * cos + z * sin, z: x * sin + z * cos }
}

/** Clamp a yaw angle into (-PI, PI] so it never accumulates unbounded values. */
export function wrapAngle(angle: number): number {
  const twoPi = Math.PI * 2
  let wrapped = angle % twoPi
  if (wrapped > Math.PI) wrapped -= twoPi
  if (wrapped <= -Math.PI) wrapped += twoPi
  return wrapped
}
