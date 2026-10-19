import * as THREE from 'three'

/**
 * Shared palette constants.
 *
 * Every prop draws from this set so the island reads as one art-directed world
 * rather than a collection of unrelated models.
 */
export const PROP_COLORS = {
  trunk: '#6b4a2f',
  trunkDark: '#5a3d27',
  leafA: '#4f8b3c',
  leafB: '#6a994e',
  leafC: '#8bbd6f',
  rock: '#8c8f84',
  rockDark: '#767a70',
  path: '#c9a87c',
  pathDark: '#b08f63',
  water: '#4e9a91',
  waterShallow: '#7cc3b4',
  cream: '#f2e8cf',
  sun: '#f2cc8f',
  roof: '#a8452f',
  wall: '#e6d3ae',
  stone: '#b9b3a4',
  wood: '#9a6b3f',
} as const

/**
 * Material cache.
 *
 * One material instance per colour, shared across every mesh that uses it, so
 * a few hundred objects still produce a very small number of draw calls and
 * programs.
 *
 * `scope` namespaces the cache key. Materials whose colour varies per island
 * must pass the island id, otherwise the first island to request a colour would
 * win for every island after it.
 */
const materialCache = new Map<string, THREE.Material>()

export function matteMaterial(
  key: string,
  color: string,
  extra?: Partial<THREE.MeshLambertMaterialParameters>,
  scope?: string,
): THREE.MeshLambertMaterial {
  const cacheKey = scope ? `${scope}:${key}` : key
  const cached = materialCache.get(cacheKey)
  if (cached) return cached as THREE.MeshLambertMaterial

  const material = new THREE.MeshLambertMaterial({ color, ...extra })
  materialCache.set(cacheKey, material)
  return material
}

/** Disposes every cached material. Call when tearing the scene down. */
export function disposeMaterials(): void {
  for (const material of materialCache.values()) material.dispose()
  materialCache.clear()
}
