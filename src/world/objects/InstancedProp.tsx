import { useMemo } from 'react'
import * as THREE from 'three'

export interface InstancedTransform {
  position: [number, number, number]
  rotationY: number
  /** Slope alignment, so props sit flush on hillsides. */
  rotationX?: number
  rotationZ?: number
  scale: number
}

export interface InstancedPropProps {
  instances: readonly InstancedTransform[]
  geometry: THREE.BufferGeometry
  material: THREE.Material
  castShadow?: boolean
  receiveShadow?: boolean
}

/**
 * Renders a list of transforms as a single instanced mesh.
 *
 * A few hundred trees cost one draw call instead of a few hundred.
 */
export function InstancedProp({
  instances,
  geometry,
  material,
  castShadow = true,
  receiveShadow = true,
}: InstancedPropProps) {
  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D()

    return instances.map((instance) => {
      dummy.position.set(instance.position[0], instance.position[1], instance.position[2])
      dummy.rotation.set(instance.rotationX ?? 0, instance.rotationY, instance.rotationZ ?? 0)
      dummy.scale.setScalar(instance.scale)
      dummy.updateMatrix()
      return dummy.matrix.clone()
    })
  }, [instances])

  return (
    <instancedMesh
      args={[geometry, material, Math.max(instances.length, 1)]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled
      ref={(node) => {
        if (!node) return
        matrices.forEach((matrix, index) => {
          node.setMatrixAt(index, matrix)
        })
        node.instanceMatrix.needsUpdate = true
        node.computeBoundingSphere()
      }}
    />
  )
}
