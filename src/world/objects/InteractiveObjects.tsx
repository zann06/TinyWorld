import { useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { IslandDefinition } from '@/types'
import { OBJECT_VISUALS, isKnownVisual } from '@/world/objects/visual-registry'
import type { Terrain } from '@/world/terrain/terrain'
import { useActiveDiscoveries, useGameStore } from '@/store/game-store'

export interface InteractiveObjectsProps {
  island: IslandDefinition
  terrain: Terrain
  /** Called with the object id, or null when the background is clicked. */
  onSelect: (id: string | null) => void
}

/**
 * Interactive landmark layer.
 *
 * Hover and selection are visual only — they never trigger React state on every
 * frame, because hover changes at human speed. Per-frame values (selection ring
 * pulse) are animated inside the Three.js frame loop.
 */
export function InteractiveObjects({ island, terrain, onSelect }: InteractiveObjectsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const selectedId = useGameStore((state) => state.selectedId)
  const discoveries = useActiveDiscoveries()
  const discoveredIds = new Set(discoveries.map((entry) => entry.id))

  return (
    <group>
      {island.objects.map((object) => {
        // Objects with an unknown visual are skipped rather than crashing the
        // scene; the registry test suite fails CI if this ever happens.
        if (!isKnownVisual(object.visual)) return null
        const Visual = OBJECT_VISUALS[object.visual]

        const y = terrain.height(object.position.x, object.position.z)
        const isSelected = selectedId === object.id
        const isHovered = hoveredId === object.id
        const isFound = discoveredIds.has(object.id)

        return (
          <group key={object.id} position={[object.position.x, y, object.position.z]}>
            <SelectionHalo
              active={isSelected}
              hovered={isHovered}
              found={isFound}
              radius={object.radius + 1.1}
            />

            <group
              onPointerOver={(event: ThreeEvent<PointerEvent>) => {
                event.stopPropagation()
                setHoveredId(object.id)
                document.body.style.cursor = 'pointer'
              }}
              onPointerOut={(event: ThreeEvent<PointerEvent>) => {
                event.stopPropagation()
                setHoveredId((current) => (current === object.id ? null : current))
                document.body.style.cursor = ''
              }}
              onClick={(event: ThreeEvent<MouseEvent>) => {
                event.stopPropagation()
                onSelect(object.id)
              }}
            >
              <Visual />
            </group>

            {/* Invisible, generous hit target — easier to click than the model. */}
            <mesh
              position={[0, 1.4, 0]}
              visible={false}
              onPointerOver={(event: ThreeEvent<PointerEvent>) => {
                event.stopPropagation()
                setHoveredId(object.id)
                document.body.style.cursor = 'pointer'
              }}
              onPointerOut={() => {
                setHoveredId((current) => (current === object.id ? null : current))
                document.body.style.cursor = ''
              }}
              onClick={(event: ThreeEvent<MouseEvent>) => {
                event.stopPropagation()
                onSelect(object.id)
              }}
            >
              <cylinderGeometry args={[object.radius, object.radius, 3.2, 8]} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

interface SelectionHaloProps {
  active: boolean
  hovered: boolean
  found: boolean
  radius: number
}

/**
 * Ground ring that communicates selection and hover state.
 * Discovered objects get a subtle permanent ring; selected/hovered objects get
 * a brighter pulsing ring.
 */
function SelectionHalo({ active, hovered, found, radius }: SelectionHaloProps) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const mesh = ref.current
    if (!mesh) return

    // Mutating the Three.js object keeps this out of React's render loop.
    mesh.visible = active || hovered || found

    const pulse = active ? 1 + Math.sin(state.clock.elapsedTime * 2.6) * 0.06 : 1
    mesh.scale.setScalar(pulse)
  })

  const color = active ? '#F2CC8F' : hovered ? '#F2E8CF' : '#6A994E'
  const opacity = active ? 0.85 : hovered ? 0.6 : 0.3

  return (
    <mesh
      ref={ref}
      position={[0, 0.14, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      visible={false}
      raycast={() => null}
    >
      <ringGeometry args={[radius * 0.86, radius, 40]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
