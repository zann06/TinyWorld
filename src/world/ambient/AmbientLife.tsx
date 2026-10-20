import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { IslandDefinition } from '@/types'
import type { Terrain } from '@/world/terrain/terrain'
import { wrapAngle } from '@/game/collision/collision'
import { matteMaterial } from '@/world/objects/materials'
import { useSettingsStore } from '@/store/settings-store'
import { ambientFor, type AmbientBoatDef, type AmbientNpcDef } from '@/world/ambient/ambient-data'

export interface AmbientLifeProps {
  island: IslandDefinition
  terrain: Terrain
  /** Inactive islands keep their meshes but skip all per-frame work. */
  active: boolean
  shadows: boolean
}

const MIN_AMBIENT_SCALE = 0.92

/** How many NPCs and boats survive each quality preset. */
function ambientLimit(quality: 'low' | 'medium' | 'high'): number {
  return quality === 'low' ? 1 : quality === 'medium' ? 2 : 3
}

/**
 * Decorative people and boats.
 *
 * These are deliberately not interactable. They exist to make the islands feel
 * inhabited without adding collision, discovery or persistence rules. Every
 * animation runs in `useFrame` and is skipped entirely on inactive islands.
 */
export function AmbientLife({ island, terrain, active, shadows }: AmbientLifeProps) {
  const quality = useSettingsStore((state) => state.quality)
  const limit = ambientLimit(quality)
  const data = useMemo(() => ambientFor(island.id), [island.id])
  const npcs = useMemo(() => data.npcs.slice(0, limit), [data, limit])
  const boats = useMemo(() => data.boats.slice(0, limit), [data, limit])

  return (
    <group>
      {npcs.map((npc) => (
        <AmbientNpc
          key={npc.id}
          definition={npc}
          terrain={terrain}
          active={active}
          shadows={shadows}
        />
      ))}
      {boats.map((boat) => (
        <SailingBoat
          key={boat.id}
          definition={boat}
          terrain={terrain}
          active={active}
          shadows={shadows}
        />
      ))}
    </group>
  )
}

function AmbientNpc({
  definition,
  terrain,
  active,
  shadows,
}: {
  definition: AmbientNpcDef
  terrain: Terrain
  active: boolean
  shadows: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const legLeftRef = useRef<THREE.Mesh>(null)
  const legRightRef = useRef<THREE.Mesh>(null)
  const armLeftRef = useRef<THREE.Mesh>(null)
  const armRightRef = useRef<THREE.Mesh>(null)
  const reducedMotion = useSettingsStore((state) => state.reducedMotion)

  const shirt = matteMaterial(
    `ambient-${definition.id}-shirt`,
    definition.shirt,
    undefined,
    'ambient',
  )
  const pants = matteMaterial(
    `ambient-${definition.id}-pants`,
    definition.pants,
    undefined,
    'ambient',
  )
  const skin = matteMaterial(`ambient-${definition.id}-skin`, definition.skin, undefined, 'ambient')
  const hair = matteMaterial(`ambient-${definition.id}-hair`, definition.hair, undefined, 'ambient')
  const accent = matteMaterial(
    `ambient-${definition.id}-accent`,
    definition.accent,
    undefined,
    'ambient',
  )
  const eye = matteMaterial('npc-eye', '#2e2620', undefined, 'ambient')

  useFrame((state, delta) => {
    const group = groupRef.current
    if (!group || !active) return

    const t = reducedMotion ? 0 : state.clock.elapsedTime
    const xPhase = t * definition.speed + definition.phase
    const zPhase = t * definition.speed * 0.73 + definition.phase * 1.31 + 1.2
    const x = definition.anchor.x + Math.cos(xPhase) * definition.wander.x
    const z = definition.anchor.z + Math.sin(zPhase) * definition.wander.z
    const ground = terrain.height(x, z)

    group.position.set(x, Math.max(ground, 0.05), z)

    const velocityX = -Math.sin(xPhase) * definition.wander.x * definition.speed
    const velocityZ =
      Math.cos(zPhase) * definition.wander.z * definition.speed * 0.73 * (reducedMotion ? 0 : 1)
    if (Math.hypot(velocityX, velocityZ) > 0.0001) {
      const targetYaw = Math.atan2(velocityX, velocityZ)
      const turn = 1 - Math.exp(-8 * Math.min(delta, 1 / 20))
      group.rotation.y = wrapAngle(
        group.rotation.y + wrapAngle(targetYaw - group.rotation.y) * turn,
      )
    }

    const moving = reducedMotion ? 0 : 1
    const swing = Math.sin(t * 7.2 + definition.phase) * 0.55 * moving

    if (bodyRef.current) {
      bodyRef.current.position.y = moving * Math.abs(Math.sin(t * 7.2 + definition.phase)) * 0.055
      bodyRef.current.rotation.x = moving * 0.05
    }
    if (legLeftRef.current) legLeftRef.current.rotation.x = swing
    if (legRightRef.current) legRightRef.current.rotation.x = -swing
    if (armLeftRef.current) armLeftRef.current.rotation.x = -swing * 0.65
    if (armRightRef.current) armRightRef.current.rotation.x = swing * 0.65
  })

  return (
    <group ref={groupRef} scale={Math.max(MIN_AMBIENT_SCALE, definition.scale)}>
      <group ref={bodyRef}>
        <mesh ref={legLeftRef} position={[-0.16, 0.36, 0]} castShadow={shadows} material={pants}>
          <capsuleGeometry args={[0.1, 0.38, 3, 6]} />
        </mesh>
        <mesh ref={legRightRef} position={[0.16, 0.36, 0]} castShadow={shadows} material={pants}>
          <capsuleGeometry args={[0.1, 0.38, 3, 6]} />
        </mesh>

        <mesh position={[0, 0.92, 0]} castShadow={shadows} material={shirt}>
          <capsuleGeometry args={[0.22, 0.4, 3, 8]} />
        </mesh>
        <mesh ref={armLeftRef} position={[-0.31, 0.93, 0]} castShadow={shadows} material={shirt}>
          <capsuleGeometry args={[0.08, 0.36, 3, 6]} />
        </mesh>
        <mesh ref={armRightRef} position={[0.31, 0.93, 0]} castShadow={shadows} material={shirt}>
          <capsuleGeometry args={[0.08, 0.36, 3, 6]} />
        </mesh>

        <mesh position={[0, 1.36, 0]} castShadow={shadows} material={skin}>
          <sphereGeometry args={[0.2, 12, 10]} />
        </mesh>
        <mesh position={[0, 1.44, -0.03]} castShadow={shadows} material={hair}>
          <sphereGeometry args={[0.205, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        </mesh>
        <mesh position={[-0.07, 1.38, 0.17]} material={eye}>
          <sphereGeometry args={[0.024, 5, 4]} />
        </mesh>
        <mesh position={[0.07, 1.38, 0.17]} material={eye}>
          <sphereGeometry args={[0.024, 5, 4]} />
        </mesh>

        {definition.style === 'hat' ? (
          <>
            <mesh
              position={[0, 1.53, 0]}
              rotation={[0.08, 0, 0]}
              castShadow={shadows}
              material={accent}
            >
              <cylinderGeometry args={[0.34, 0.36, 0.04, 12]} />
            </mesh>
            <mesh position={[0, 1.6, 0]} castShadow={shadows} material={accent}>
              <cylinderGeometry args={[0.17, 0.19, 0.16, 12]} />
            </mesh>
          </>
        ) : null}

        {definition.style === 'hood' ? (
          <mesh
            position={[0, 1.38, -0.04]}
            scale={[1.18, 1.24, 1.18]}
            castShadow={shadows}
            material={accent}
          >
            <sphereGeometry args={[0.23, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
          </mesh>
        ) : null}

        {definition.style === 'apron' ? (
          <>
            <mesh position={[0, 0.86, 0.2]} material={accent}>
              <boxGeometry args={[0.38, 0.62, 0.035]} />
            </mesh>
            <mesh position={[0.27, 0.62, -0.18]} castShadow={shadows} material={accent}>
              <boxGeometry args={[0.22, 0.28, 0.14]} />
            </mesh>
          </>
        ) : null}
      </group>
    </group>
  )
}

function SailingBoat({
  definition,
  terrain,
  active,
  shadows,
}: {
  definition: AmbientBoatDef
  terrain: Terrain
  active: boolean
  shadows: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const sailRef = useRef<THREE.Group>(null)
  const reducedMotion = useSettingsStore((state) => state.reducedMotion)

  const hull = matteMaterial(`boat-${definition.id}-hull`, definition.hull, undefined, 'ambient')
  const sail = matteMaterial(
    `boat-${definition.id}-sail`,
    definition.sail,
    { side: THREE.DoubleSide },
    'ambient',
  )
  const trim = matteMaterial(`boat-${definition.id}-trim`, definition.trim, undefined, 'ambient')
  const mast = matteMaterial('boat-mast', '#6b4a2f', undefined, 'ambient')
  const lantern = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#ffd77a', transparent: true, opacity: 0.9 }),
    [],
  )

  useFrame((state) => {
    const group = groupRef.current
    if (!group || !active) return

    const t = reducedMotion ? 0 : state.clock.elapsedTime
    const orbit = definition.angle + t * definition.speed
    const direction = Math.cos(orbit)
    const perpendicular = Math.sin(orbit)
    const shoreline = terrain.coastRadiusAt(direction, perpendicular)
    const radius = shoreline * definition.orbitFactor + definition.orbitOffset
    const x = direction * radius
    const z = perpendicular * radius

    const bob = reducedMotion
      ? 0
      : Math.sin(t * 1.15 + definition.phase) * 0.06 +
        Math.sin(t * 2.6 + definition.phase * 1.7) * 0.018

    group.position.set(x, -0.42 + bob, z)
    group.rotation.y = Math.atan2(
      -perpendicular * Math.sign(definition.speed),
      direction * Math.sign(definition.speed),
    )
    group.rotation.z = reducedMotion ? 0 : Math.sin(t * 1.4 + definition.phase) * 0.035
    group.rotation.x = reducedMotion ? 0 : Math.cos(t * 1.1 + definition.phase) * 0.022

    if (sailRef.current) {
      sailRef.current.rotation.y = reducedMotion ? 0 : Math.sin(t * 0.9 + definition.phase) * 0.035
    }
  })

  return (
    <group ref={groupRef} scale={definition.scale}>
      {/* Hull and raised sides */}
      <mesh position={[0, 0.25, 0]} castShadow={shadows} material={hull}>
        <boxGeometry args={[1.12, 0.5, 2.9]} />
      </mesh>
      <mesh position={[0, 0.1, 0]} material={hull}>
        <boxGeometry args={[0.94, 0.34, 2.6]} />
      </mesh>
      <mesh
        position={[0, 0.28, 1.78]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow={shadows}
        material={hull}
      >
        <coneGeometry args={[0.58, 1.05, 4]} />
      </mesh>
      {[-0.6, 0.6].map((x, index) => (
        <mesh key={`gunwale-${index}`} position={[x, 0.5, 0]} castShadow={shadows} material={trim}>
          <boxGeometry args={[0.1, 0.16, 2.8]} />
        </mesh>
      ))}
      <mesh position={[0, 0.5, -1.48]} castShadow={shadows} material={trim}>
        <boxGeometry args={[1.1, 0.16, 0.12]} />
      </mesh>
      <mesh position={[0, 0.5, -0.35]} material={trim}>
        <boxGeometry args={[0.86, 0.06, 1.35]} />
      </mesh>

      {/* Mast, boom and sail */}
      <mesh position={[0, 1.62, 0.22]} castShadow={shadows} material={mast}>
        <cylinderGeometry args={[0.055, 0.075, 3.05, 7]} />
      </mesh>
      <mesh position={[0.22, 0.98, 0.22]} rotation={[0, 0, Math.PI / 2]} material={mast}>
        <cylinderGeometry args={[0.04, 0.04, 1.55, 6]} />
      </mesh>
      <group ref={sailRef} position={[0.4, 1.92, 0.16]} rotation={[0, 0.06, 0.035]}>
        <mesh castShadow={shadows} material={sail}>
          <planeGeometry args={[1.5, 2.25, 4, 4]} />
        </mesh>
        <mesh position={[-0.18, 0.2, 0.03]} material={sail}>
          <planeGeometry args={[0.62, 1.55, 1, 1]} />
        </mesh>
      </group>
      <mesh position={[0, 3.2, 0.22]} material={trim}>
        <boxGeometry args={[0.52, 0.2, 0.03]} />
      </mesh>

      {/* A small keeper at the tiller */}
      <mesh position={[0, 0.86, -0.92]} castShadow={shadows} material={trim}>
        <capsuleGeometry args={[0.14, 0.24, 3, 6]} />
      </mesh>
      <mesh
        position={[0, 1.18, -0.92]}
        castShadow={shadows}
        material={matteMaterial('boat-sailor', '#e8b98a', undefined, 'ambient')}
      >
        <sphereGeometry args={[0.13, 8, 6]} />
      </mesh>
      <mesh
        position={[0, 1.26, -0.94]}
        material={matteMaterial('boat-sailor-hat', '#d9c08a', undefined, 'ambient')}
      >
        <cylinderGeometry args={[0.2, 0.21, 0.05, 10]} />
      </mesh>

      {/* Stern lantern and wake */}
      <mesh position={[0, 0.82, -1.42]} material={lantern}>
        <sphereGeometry args={[0.1, 8, 6]} />
      </mesh>
      <mesh position={[0, -0.1, -2.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.9, 2.8]} />
        <meshBasicMaterial color="#dff3ee" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  )
}
