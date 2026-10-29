import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { IslandDefinition } from '@/types'
import type { Terrain } from '@/world/terrain/terrain'
import { getObjectById } from '@/data/objects'
import { currentObjective } from '@/game/quest/objective'
import { useGameStore } from '@/store/game-store'
import { useSettingsStore } from '@/store/settings-store'

export interface ObjectiveBeaconProps {
  island: IslandDefinition
  terrain: Terrain
}

/**
 * The in-world objective marker.
 *
 * A tall light shaft with a floating diamond and a pulsing ground ring, drawn
 * over the landmark that completes the current Legacy step on this island.
 * Like the quest tracker it is derived from discoveries, so it disappears the
 * moment the step is completed — no second quest state to keep in sync.
 */
export function ObjectiveBeacon({ island, terrain }: ObjectiveBeaconProps) {
  const discoveriesByIsland = useGameStore((s) => s.discoveriesByIsland)
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)
  const quality = useSettingsStore((s) => s.quality)

  const target = useMemo(() => {
    const objective = currentObjective(discoveriesByIsland)
    if (!objective || objective.islandId !== island.id) return null
    return getObjectById(island, objective.objectId) ?? null
  }, [discoveriesByIsland, island])

  const base = useMemo(() => {
    if (!target) return null
    const { x, z } = target.position
    return { x, z, y: terrain.height(x, z) }
  }, [target, terrain])

  const markerRef = useRef<THREE.Mesh>(null)
  const shaftRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    if (reducedMotion) return

    const t = state.clock.elapsedTime
    const dt = Math.min(delta, 1 / 20)

    if (markerRef.current) {
      // Bob and slowly spin above the landmark.
      markerRef.current.position.y = 4.4 + Math.sin(t * 1.8) * 0.4
      markerRef.current.rotation.y += dt * 1.1
    }
    if (shaftRef.current) {
      const material = shaftRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.14 + Math.sin(t * 1.3) * 0.05
    }
    if (ringRef.current) {
      const pulse = 1 + Math.sin(t * 2.2) * 0.08
      ringRef.current.scale.set(pulse, pulse, 1)
    }
  })

  if (!target || !base) return null

  return (
    <group position={[base.x, base.y, base.z]}>
      {/* Light shaft — skipped on the low quality tier, additive so it glows. */}
      {quality !== 'low' ? (
        <mesh ref={shaftRef} position={[0, 9, 0]} raycast={() => null} renderOrder={5}>
          <cylinderGeometry args={[0.5, 1.2, 18, 12, 1, true]} />
          <meshBasicMaterial
            color="#ffd166"
            transparent
            opacity={0.16}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ) : null}

      {/* Floating diamond marker */}
      <mesh ref={markerRef} position={[0, 4.4, 0]} raycast={() => null} renderOrder={5}>
        <octahedronGeometry args={[0.62, 0]} />
        <meshBasicMaterial color="#ffd166" toneMapped={false} />
      </mesh>
      <mesh position={[0, 4.4, 0]} raycast={() => null} renderOrder={5}>
        <sphereGeometry args={[0.95, 10, 8]} />
        <meshBasicMaterial
          color="#ffe6a3"
          transparent
          opacity={0.25}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Pulsing ground ring */}
      <mesh
        ref={ringRef}
        position={[0, 0.22, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={() => null}
        renderOrder={5}
      >
        <ringGeometry args={[2.2, 2.8, 36]} />
        <meshBasicMaterial
          color="#ffd166"
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
