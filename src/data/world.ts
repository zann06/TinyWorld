import type { CoastShape } from '@/types'

/**
 * Coastline mathematics.
 *
 * Pure and island-agnostic: every shape parameter arrives through the `CoastShape`
 * argument, so this module never needs to know which island it is describing. It
 * lives outside the terrain module because collision and prop placement need the
 * same boundary without pulling in Three.js — one source of truth keeps the
 * walkable area and the rendered shore from ever drifting apart.
 */

/** Wrap an angle into (-PI, PI] so the bay term behaves consistently. */
function wrapAngle(angle: number): number {
  const twoPi = Math.PI * 2
  let wrapped = angle % twoPi
  if (wrapped > Math.PI) wrapped -= twoPi
  if (wrapped <= -Math.PI) wrapped += twoPi
  return wrapped
}

/**
 * The coastline radius at a given angle, including its wobble and any bay.
 *
 * The harmonics stack into the wobble term; the bay subtracts a smooth Gaussian
 * dip where the shore folds inward.
 */
export function coastlineRadius(angle: number, radius: number, coast: CoastShape): number {
  let wobble = 0
  for (const harmonic of coast.harmonics) {
    wobble += harmonic.amplitude * Math.sin(angle * harmonic.frequency + harmonic.phase)
  }

  const { angle: bayAngle, width, depth } = coast.bay
  const bayOffset = wrapAngle(angle - bayAngle)
  const bay = Math.exp(-Math.pow(bayOffset / width, 2)) * depth

  return radius * (1 + wobble - bay)
}

/** Coastline radius for a world-space XZ coordinate. */
export function coastlineRadiusAt(x: number, z: number, radius: number, coast: CoastShape): number {
  return coastlineRadius(Math.atan2(z, x), radius, coast)
}
