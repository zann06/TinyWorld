import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { IslandDefinition } from '@/types'
import { movementState } from '@/game/input/useKeyboardControls'
import { createTerrain } from '@/world/terrain/terrain'
import { matteMaterial } from '@/world/objects/materials'

export interface PlayerAvatarProps {
  island: IslandDefinition
}

/**
 * The explorer avatar.
 *
 * A small low-poly figure with a bobbing idle and a forward lean while moving.
 * Animation runs entirely in the frame loop; no React state is touched.
 */
export function PlayerAvatar({ island }: PlayerAvatarProps) {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const legLeftRef = useRef<THREE.Mesh>(null)
  const legRightRef = useRef<THREE.Mesh>(null)
  const armLeftRef = useRef<THREE.Mesh>(null)
  const armRightRef = useRef<THREE.Mesh>(null)

  const terrain = useMemo(() => createTerrain(island), [island])

  useFrame((state) => {
    const group = groupRef.current
    if (!group) return

    const { x, z } = movementState.player
    const ground = terrain.height(x, z)

    group.position.set(x, ground, z)
    // Face the direction of travel; when idle, face away from the camera.
    const targetYaw = movementState.speed > 0.4 ? movementState.yaw : movementState.yaw + Math.PI
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetYaw, 8, 1 / 60)

    const t = state.clock.elapsedTime
    const moving = Math.min(1, movementState.speed / 8)
    const swing = Math.sin(t * 9) * 0.7 * moving

    if (bodyRef.current) {
      const bob = moving > 0.1 ? Math.abs(Math.sin(t * 9)) * 0.12 : Math.sin(t * 1.9) * 0.035
      bodyRef.current.position.y = bob
      bodyRef.current.rotation.x = moving * 0.14
    }

    if (legLeftRef.current) legLeftRef.current.rotation.x = swing
    if (legRightRef.current) legRightRef.current.rotation.x = -swing
    if (armLeftRef.current) armLeftRef.current.rotation.x = -swing * 0.7
    if (armRightRef.current) armRightRef.current.rotation.x = swing * 0.7
  })

  const skin = matteMaterial('avatar-skin', '#e8b98a')
  const shirt = matteMaterial('avatar-shirt', '#a8452f')
  const pants = matteMaterial('avatar-pants', '#386641')
  const hair = matteMaterial('avatar-hair', '#4a3728')
  const pack = matteMaterial('avatar-pack', '#9a6b3f')

  return (
    <group ref={groupRef}>
      <group ref={bodyRef}>
        {/* Legs */}
        <mesh ref={legLeftRef} position={[-0.18, 0.42, 0]} castShadow material={pants}>
          <capsuleGeometry args={[0.13, 0.42, 3, 8]} />
        </mesh>
        <mesh ref={legRightRef} position={[0.18, 0.42, 0]} castShadow material={pants}>
          <capsuleGeometry args={[0.13, 0.42, 3, 8]} />
        </mesh>

        {/* Torso */}
        <mesh position={[0, 1.05, 0]} castShadow material={shirt}>
          <capsuleGeometry args={[0.26, 0.42, 4, 10]} />
        </mesh>
        {/* Backpack */}
        <mesh position={[0, 1.1, -0.3]} castShadow material={pack}>
          <boxGeometry args={[0.4, 0.48, 0.24]} />
        </mesh>

        {/* Arms */}
        <mesh ref={armLeftRef} position={[-0.36, 1.05, 0]} castShadow material={shirt}>
          <capsuleGeometry args={[0.1, 0.4, 3, 8]} />
        </mesh>
        <mesh ref={armRightRef} position={[0.36, 1.05, 0]} castShadow material={shirt}>
          <capsuleGeometry args={[0.1, 0.4, 3, 8]} />
        </mesh>

        {/* Head */}
        <mesh position={[0, 1.52, 0]} castShadow material={skin}>
          <sphereGeometry args={[0.24, 14, 12]} />
        </mesh>
        <mesh position={[0, 1.63, -0.04]} castShadow material={hair}>
          <sphereGeometry args={[0.245, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        </mesh>
        {/* Hat brim */}
        <mesh
          position={[0, 1.7, 0]}
          rotation={[0.12, 0, 0]}
          castShadow
          material={matteMaterial('avatar-hat', '#e6d3ae')}
        >
          <cylinderGeometry args={[0.42, 0.44, 0.05, 14]} />
        </mesh>
        <mesh position={[0, 1.79, 0]} castShadow material={matteMaterial('avatar-hat', '#e6d3ae')}>
          <cylinderGeometry args={[0.22, 0.24, 0.2, 14]} />
        </mesh>
      </group>
    </group>
  )
}
