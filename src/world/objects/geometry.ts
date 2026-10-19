import * as THREE from 'three'

/**
 * Shared geometry cache.
 *
 * Geometries are built once per session and reused by every instanced prop.
 * Cached shapes carry the same name as the material cache for readability.
 */
const cache = new Map<string, THREE.BufferGeometry>()

function memoGeometry<T extends THREE.BufferGeometry>(key: string, create: () => T): T {
  const existing = cache.get(key)
  if (existing) return existing as T

  const created = create()
  cache.set(key, created)
  return created
}

export const Geometries = {
  trunk: () =>
    memoGeometry('trunk', () => {
      const geometry = new THREE.CylinderGeometry(0.16, 0.24, 1.5, 6)
      geometry.translate(0, 0.75, 0)
      return geometry
    }),
  canopyCone: () => memoGeometry('canopyCone', () => new THREE.ConeGeometry(1.15, 2.1, 7)),
  rock: () => memoGeometry('rock', () => new THREE.DodecahedronGeometry(0.7, 0)),
  grassBlade: () => memoGeometry('grassBlade', () => new THREE.ConeGeometry(0.1, 0.62, 4)),
  flowerHead: () => memoGeometry('flowerHead', () => new THREE.IcosahedronGeometry(0.16, 0)),
  pathDisc: () =>
    memoGeometry('pathDisc', () => {
      const geometry = new THREE.CircleGeometry(0.85, 10)
      geometry.rotateX(-Math.PI / 2)
      return geometry
    }),
} as const

/** Disposes every cached geometry. Call when tearing the scene down. */
export function disposeGeometries(): void {
  for (const geometry of cache.values()) geometry.dispose()
  cache.clear()
}

/** Frees every shared GPU resource used by the world props. */
export function releaseSharedResources(): void {
  disposeGeometries()
}
