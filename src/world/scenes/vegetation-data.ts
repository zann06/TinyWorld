import type { IslandDefinition } from '@/types'
import type { InstancedTransform } from '@/world/objects/InstancedProp'
import {
  createTerrain,
  scatterInCluster,
  seededRandom,
  type Terrain,
} from '@/world/terrain/terrain'

export interface VegetationData {
  trunks: InstancedTransform[]
  canopies: InstancedTransform[]
  rocks: InstancedTransform[]
  grass: InstancedTransform[]
  flowers: InstancedTransform[]
}

/** Build every decorative instance for one island. */
function build(island: IslandDefinition, terrain: Terrain): VegetationData {
  const rand = seededRandom(island.seed)
  const blocked = island.obstacles.map((o) => ({ x: o.x, z: o.z, radius: o.radius }))

  // Trees avoid cliffs; rocks happily perch on them.
  const treePoints = island.scatter.tree.flatMap((cluster) =>
    scatterInCluster(terrain, cluster, cluster.count, rand, blocked, {
      jitter: 0.95,
      maxSlope: 0.85,
      minHeight: 0.2,
    }),
  )

  const rockPoints = island.scatter.rock.flatMap((cluster) =>
    scatterInCluster(terrain, cluster, cluster.count, rand, blocked, {
      jitter: 0.9,
      maxSlope: 2.4,
      minHeight: -0.6,
    }),
  )

  const grassPoints = island.scatter.flower.flatMap((patch) =>
    scatterInCluster(terrain, patch, Math.round(patch.count * 1.6), rand, blocked, {
      jitter: 0.95,
      maxSlope: 1.4,
      minHeight: 0.1,
    }),
  )

  const flowerPoints = island.scatter.flower.flatMap((patch) =>
    scatterInCluster(terrain, patch, patch.count, rand, blocked, {
      jitter: 0.85,
      maxSlope: 1.1,
      minHeight: 0.1,
    }),
  )

  const buildInstances = (
    points: readonly { x: number; z: number }[],
    scaleRange: [number, number],
    yOffset: number,
    alignToSlope = false,
  ) =>
    points.map((point) => {
      const height = terrain.height(point.x, point.z)
      const rotationY = rand() * Math.PI * 2

      if (!alignToSlope) {
        return {
          position: [point.x, height + yOffset, point.z] as [number, number, number],
          rotationY,
          scale: scaleRange[0] + rand() * (scaleRange[1] - scaleRange[0]),
        }
      }

      // Lean the prop into the hillside so it never appears to float.
      const normal = terrain.normal(point.x, point.z)
      return {
        position: [point.x, height + yOffset, point.z] as [number, number, number],
        rotationY,
        rotationX: Math.atan2(normal.z, normal.y) * 0.6,
        rotationZ: -Math.atan2(normal.x, normal.y) * 0.6,
        scale: scaleRange[0] + rand() * (scaleRange[1] - scaleRange[0]),
      }
    })

  return {
    trunks: buildInstances(treePoints, [0.85, 1.3], 0, true),
    canopies: buildInstances(treePoints, [0.8, 1.35], 2.05, true),
    rocks: buildInstances(rockPoints, [0.6, 1.5], 0.15, true),
    grass: buildInstances(grassPoints, [0.7, 1.4], 0.25, true),
    flowers: buildInstances(flowerPoints, [0.8, 1.5], 0.5, false),
  }
}

/**
 * Scatter is deterministic and depends only on the island definition, so it is
 * cached for the session. Returning to an island reuses the transforms instead
 * of re-running thousands of height and slope samples.
 */
const CACHE = new WeakMap<IslandDefinition, VegetationData>()

export function getVegetationData(island: IslandDefinition, terrain?: Terrain): VegetationData {
  const cached = CACHE.get(island)
  if (cached) return cached

  const data = build(island, terrain ?? createTerrain(island))
  CACHE.set(island, data)
  return data
}
