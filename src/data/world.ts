import type { Obstacle } from '@/types'

/**
 * Greenhaven Island — static world description.
 *
 * This file is pure data with no rendering or React dependency, so it can be
 * unit-tested, imported by the scene, and extended by contributors without
 * touching the 3D components.
 */

export const ISLAND_NAME = 'Greenhaven Island'
export const ISLAND_TAGLINE = 'A little world, waiting to be explored.'

/** Radius of the walkable island, in world units. */
export const ISLAND_RADIUS = 46

/** Terrain amplitude and base height. */
export const TERRAIN_HEIGHT = 9.5
export const SEA_LEVEL = 0

/** Shape of the sheltered bay cut into the coastline, in radians and units. */
const BAY_ANGLE = 0.35
const BAY_WIDTH = 0.5
const BAY_DEPTH = 0.1

export interface PathPoint {
  x: number
  z: number
}

/** The winding footpath that links the landmarks together. */
export const PATH_POINTS: readonly PathPoint[] = [
  { x: -30, z: 26 },
  { x: -20, z: 16 },
  { x: -12, z: 8 },
  { x: -6, z: 0 },
  { x: -2, z: -8 },
  { x: 4, z: -16 },
  { x: 12, z: -22 },
  { x: 22, z: -24 },
  { x: 30, z: -18 },
]

/** Landmark anchors, referenced by both the scene and the interaction data. */
export const LANDMARK_POSITIONS = {
  lighthouse: { x: 30, z: -18 },
  cottage: { x: -12, z: 8 },
  windmill: { x: 12, z: -22 },
  dock: { x: -30, z: 26 },
  boardwalk: { x: -20, z: 16 },
  watchtower: { x: -2, z: -8 },
  garden: { x: 22, z: -24 },
  camp: { x: -22, z: -14 },
  arch: { x: 4, z: -16 },
  spring: { x: 10, z: 10 },
} as const satisfies Record<string, { x: number; z: number }>

/**
 * Solid structures the player cannot walk through.
 * Rendered from the same data as the meshes so the two never drift apart.
 */
export const OBSTACLES: readonly Obstacle[] = [
  { id: 'lighthouse', x: 30, z: -18, radius: 3.2 },
  { id: 'cottage', x: -12, z: 8, radius: 3.6 },
  { id: 'windmill', x: 12, z: -22, radius: 2.8 },
  { id: 'watchtower', x: -2, z: -8, radius: 2.6 },
  { id: 'dock-pier', x: -30, z: 26, radius: 3.0 },
  { id: 'garden-fence', x: 22, z: -24, radius: 4.2 },
  { id: 'camp-tent', x: -22, z: -14, radius: 2.4 },
  { id: 'arch-stone', x: 4, z: -16, radius: 1.8 },
  { id: 'boardwalk-sign', x: -20, z: 16, radius: 1.4 },
  { id: 'spring-pool', x: 10, z: 10, radius: 2.4 },
  { id: 'camp-campfire', x: -22, z: -14, radius: 1.6 },
]

export interface TreeCluster {
  x: number
  z: number
  count: number
  radius: number
}

/** Decorative tree placement. The scene derives deterministic per-tree jitter. */
export const TREE_CLUSTERS: readonly TreeCluster[] = [
  { x: -34, z: -2, count: 16, radius: 10 },
  { x: -30, z: 20, count: 12, radius: 9 },
  { x: -18, z: -26, count: 16, radius: 11 },
  { x: -8, z: -32, count: 12, radius: 9 },
  { x: 6, z: 30, count: 14, radius: 10 },
  { x: 20, z: 30, count: 12, radius: 9 },
  { x: 30, z: 12, count: 15, radius: 10 },
  { x: 34, z: -8, count: 12, radius: 9 },
  { x: 34, z: -30, count: 12, radius: 9 },
  { x: 20, z: -6, count: 10, radius: 8 },
  { x: -6, z: -14, count: 10, radius: 8 },
  { x: -32, z: -22, count: 10, radius: 8 },
  { x: 4, z: 18, count: 10, radius: 8 },
  { x: -14, z: 24, count: 10, radius: 8 },
  { x: 26, z: -18, count: 10, radius: 8 },
]

export interface RockCluster {
  x: number
  z: number
  count: number
  radius: number
}

export const ROCK_CLUSTERS: readonly RockCluster[] = [
  { x: -26, z: 30, count: 8, radius: 5 },
  { x: 20, z: 18, count: 7, radius: 5 },
  { x: -16, z: -20, count: 6, radius: 4 },
  { x: 38, z: -6, count: 6, radius: 5 },
  { x: -4, z: 34, count: 6, radius: 5 },
  { x: 34, z: 24, count: 6, radius: 5 },
]

export interface FlowerPatch {
  x: number
  z: number
  count: number
  radius: number
}

export const FLOWER_PATCHES: readonly FlowerPatch[] = [
  { x: -6, z: 14, count: 22, radius: 5 },
  { x: 18, z: 4, count: 18, radius: 5 },
  { x: -24, z: 4, count: 20, radius: 6 },
  { x: 26, z: -30, count: 16, radius: 5 },
  { x: 0, z: -24, count: 14, radius: 5 },
  { x: -30, z: 12, count: 16, radius: 5 },
  { x: 14, z: 22, count: 16, radius: 5 },
  { x: -12, z: -30, count: 14, radius: 5 },
  { x: 30, z: -22, count: 14, radius: 5 },
]

/** Player spawn point, on the path near the dock. */
export const SPAWN_POSITION = { x: -26, z: 22 } as const

/** Wrap an angle into (-PI, PI] so the bay term behaves consistently. */
function wrapAngle(angle: number): number {
  const twoPi = Math.PI * 2
  let wrapped = angle % twoPi
  if (wrapped > Math.PI) wrapped -= twoPi
  if (wrapped <= -Math.PI) wrapped += twoPi
  return wrapped
}

/**
 * The coastline radius at a given angle, including its wobble.
 *
 * Lives here — not in the terrain module — because collision and placement need
 * the same boundary without pulling in Three.js. A single source of truth keeps
 * the walkable area and the rendered shore from ever drifting apart.
 */
export function coastlineRadius(angle: number): number {
  // A sheltered bay on the eastern shore, clear of every landmark.
  const bayOffset = wrapAngle(angle - BAY_ANGLE)
  const bay = Math.exp(-Math.pow(bayOffset / BAY_WIDTH, 2)) * BAY_DEPTH

  return (
    ISLAND_RADIUS *
    (1 +
      0.14 * Math.sin(angle * 2 + 0.9) +
      0.09 * Math.sin(angle * 3 - 0.4) +
      0.05 * Math.sin(angle * 5 + 2.1) +
      0.03 * Math.sin(angle * 8 - 1.1) -
      bay)
  )
}

/** Coastline radius for a world-space XZ coordinate. */
export function coastlineRadiusAt(x: number, z: number): number {
  return coastlineRadius(Math.atan2(z, x))
}
