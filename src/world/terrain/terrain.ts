import * as THREE from 'three'
import type { IslandDefinition, PathPoint, ScatterCluster } from '@/types'
import { coastlineRadiusAt } from '@/data/world'

/**
 * Terrain fields.
 *
 * `createTerrain` binds one island and returns the functions bound to it. The
 * island is captured in a closure rather than read from module state, so two
 * terrains can coexist and every function stays pure and unit-testable.
 */

/** Smooth 0→1 ramp. */
function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** Deterministic value noise in [-1, 1] from a 2D hash. */
function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return (s - Math.floor(s)) * 2 - 1
}

/** Smooth pseudo-noise built from incommensurate sine fields. */
function wave(x: number, z: number): number {
  return (
    Math.sin(x * 0.09 + 0.4) * Math.cos(z * 0.075 - 0.8) * 0.62 +
    Math.sin((x + z) * 0.045 + 1.7) * 0.38
  )
}

/** Finer detail octave layered on top of the primary wave field. */
function detail(x: number, z: number): number {
  return (
    Math.sin(x * 0.21 - 1.2) * Math.cos(z * 0.19 + 0.3) * 0.55 +
    Math.sin((x - z) * 0.13 + 2.4) * 0.45
  )
}

export interface Terrain {
  readonly islandId: string
  /** Coastline radius at a world-space XZ coordinate. */
  coastRadiusAt: (x: number, z: number) => number
  /** Height of the terrain surface. Negative beyond the shoreline. */
  height: (x: number, z: number) => number
  /** Approximate surface normal, used to align props to the slope. */
  normal: (x: number, z: number, epsilon?: number) => THREE.Vector3
  /** True when the coordinate is on dry land, above the waterline. */
  isOnLand: (x: number, z: number) => boolean
  /** Steepness of the ground as rise over run. */
  slope: (x: number, z: number, epsilon?: number) => number
  /** Build the island mesh as a displaced grid with baked vertex colours. */
  buildGeometry: (segments?: number) => THREE.BufferGeometry
  /** Sampled points along the island footpath. */
  samplePath: (
    points?: readonly PathPoint[],
    perSegment?: number,
  ) => { x: number; y: number; z: number }[]
}

/** Build the terrain functions for one island. */
export function createTerrain(island: IslandDefinition): Terrain {
  const { radius, shape, coast, palette } = island

  const coastRadiusAt = (x: number, z: number): number => coastlineRadiusAt(x, z, radius, coast)

  const height = (x: number, z: number): number => {
    const distance = Math.hypot(x, z)
    const shoreline = coastRadiusAt(x, z)

    // Dome falloff from the centre of the island.
    const inland = smoothstep(0, shoreline * 0.8, shoreline - distance)

    // Rolling hills, fading out at the shore so beaches stay flat.
    const hills = wave(x, z) * shape.hills + detail(x, z) * shape.detail

    // A raised ridge running along the island's spine.
    const spine =
      Math.exp(-Math.pow((z - shape.spine.offsetZ) / shape.spine.spread, 2)) * shape.spine.amplitude

    // A secondary knoll, so the skyline has more than one silhouette.
    const knoll =
      Math.exp(
        -(
          Math.pow((x - shape.knoll.centreX) / shape.knoll.spreadX, 2) +
          Math.pow((z - shape.knoll.centreZ) / shape.knoll.spreadZ, 2)
        ),
      ) * shape.knoll.amplitude

    const plateau = island.terrainHeight * Math.pow(inland, 0.55)
    const undulation = (hills + spine + knoll) * inland

    const total = plateau + undulation

    // Beach: ramp down past the waterline instead of ending abruptly.
    // 0 inland, 1 at (and beyond) the shoreline.
    const beach = smoothstep(shoreline * 0.93, shoreline, distance)
    return total * (1 - beach) - beach * shape.shoreDepth
  }

  const normal = (x: number, z: number, epsilon = 0.6): THREE.Vector3 => {
    const hL = height(x - epsilon, z)
    const hR = height(x + epsilon, z)
    const hD = height(x, z - epsilon)
    const hU = height(x, z + epsilon)

    return new THREE.Vector3(hL - hR, 2 * epsilon, hD - hU).normalize()
  }

  const slope = (x: number, z: number, epsilon = 1.5): number => {
    const hL = height(x - epsilon, z)
    const hR = height(x + epsilon, z)
    const hD = height(x, z - epsilon)
    const hU = height(x, z + epsilon)

    const dx = (hR - hL) / (2 * epsilon)
    const dz = (hU - hD) / (2 * epsilon)

    return Math.hypot(dx, dz)
  }

  const isOnLand = (x: number, z: number): boolean => {
    if (height(x, z) <= 0) return false
    // Guard against a coordinate technically above water but outside the mesh.
    return Math.hypot(x, z) < coastRadiusAt(x, z)
  }

  return {
    islandId: island.id,
    coastRadiusAt,
    height,
    normal,
    slope,
    isOnLand,

    buildGeometry(segments = 110): THREE.BufferGeometry {
      const extent = radius * 1.16
      const size = extent * 2

      const geometry = new THREE.PlaneGeometry(size, size, segments, segments)
      geometry.rotateX(-Math.PI / 2)

      const position = geometry.attributes['position'] as THREE.BufferAttribute
      const colors = new Float32Array(position.count * 3)

      const scratch = new THREE.Color()
      const grassHigh = new THREE.Color(palette.grassHigh)
      const grassLow = new THREE.Color(palette.grassLow)
      const meadow = new THREE.Color(palette.meadow)
      const sand = new THREE.Color(palette.sand)
      const shore = new THREE.Color(palette.shore)
      const rock = new THREE.Color(palette.rock)
      const grassMid = new THREE.Color().lerpColors(grassLow, grassHigh, 0.5)

      for (let index = 0; index < position.count; index += 1) {
        const x = position.getX(index)
        const z = position.getZ(index)
        const y = height(x, z)
        position.setY(index, y)

        // Blend shoreline sand -> grass -> meadow with elevation and shore proximity.
        const shoreBlend = smoothstep(-0.9, 2.2, y)
        const meadowBlend = smoothstep(3.5, 8.5, y)

        scratch.copy(shore).lerp(sand, smoothstep(0.6, 3.4, y))
        scratch.lerp(grassMid, shoreBlend)
        scratch.lerp(meadow, meadowBlend * 0.6)

        // Sparse rock speckle on the higher ground, driven by the same wave field.
        const rockAmount = smoothstep(0.7, 0.96, wave(x * 3.3, z * 3.3)) * meadowBlend * 0.7
        scratch.lerp(rock, rockAmount)

        // Larger-scale patches keep the big green surface from reading as one flat
        // sheet, plus a fine per-vertex tint for texture.
        const patches = wave(x * 0.55 + 31, z * 0.55 - 17)
        scratch.lerp(meadow, Math.max(0, patches) * 0.22 * shoreBlend)
        const variation = hash2(Math.floor(x * 0.5), Math.floor(z * 0.5)) * 0.05
        scratch.offsetHSL(0, 0, variation)

        colors[index * 3] = scratch.r
        colors[index * 3 + 1] = scratch.g
        colors[index * 3 + 2] = scratch.b
      }

      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      geometry.computeVertexNormals()
      geometry.computeBoundingSphere()

      return geometry
    },

    samplePath(points = island.path, perSegment = 12) {
      if (points.length < 2) return []

      const samples: { x: number; y: number; z: number }[] = []

      for (let i = 0; i < points.length - 1; i += 1) {
        const from = points[i]
        const to = points[i + 1]
        if (!from || !to) continue

        for (let step = 0; step < perSegment; step += 1) {
          const t = step / perSegment
          const x = from.x + (to.x - from.x) * t
          const z = from.z + (to.z - from.z) * t
          samples.push({ x, y: height(x, z), z })
        }
      }

      const last = points[points.length - 1]
      if (last) samples.push({ x: last.x, y: height(last.x, last.z), z: last.z })

      return samples
    },
  }
}

/**
 * Deterministic pseudo-random sequence.
 * Used to scatter vegetation reproducibly — an island looks the same on every
 * load, which keeps screenshots and E2E assertions stable.
 */
export function seededRandom(seed: number): () => number {
  let state = seed % 2147483647
  if (state <= 0) state += 2147483646

  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

/** Scatter points inside a cluster, skipping water and landmark footprints. */
export function scatterInCluster(
  terrain: Terrain,
  center: ScatterCluster,
  count: number,
  rand: () => number,
  blocked: readonly { x: number; z: number; radius: number }[],
  options: { jitter?: number; maxSlope?: number; minHeight?: number } = {},
): { x: number; z: number }[] {
  const { jitter = 0.85, maxSlope = Number.POSITIVE_INFINITY, minHeight = -0.05 } = options
  const results: { x: number; z: number }[] = []
  const effectiveRadius = center.radius * jitter

  for (let i = 0; i < count * 3 && results.length < count; i += 1) {
    const angle = rand() * Math.PI * 2
    const distance = Math.sqrt(rand()) * effectiveRadius
    const x = center.x + Math.cos(angle) * distance
    const z = center.z + Math.sin(angle) * distance

    if (terrain.height(x, z) <= minHeight) continue
    if (terrain.slope(x, z) > maxSlope) continue
    if (blocked.some((b) => Math.hypot(b.x - x, b.z - z) < b.radius + 1.4)) continue

    results.push({ x, z })
  }

  return results
}
