import { useMemo } from 'react'
import * as THREE from 'three'
import type { IslandDefinition } from '@/types'
import { InstancedProp } from '@/world/objects/InstancedProp'
import { Geometries } from '@/world/objects/geometry'
import { PROP_COLORS, matteMaterial } from '@/world/objects/materials'
import { TERRAIN_SEGMENTS, type Terrain } from '@/world/terrain/terrain'
import { getVegetationData } from '@/world/scenes/vegetation-data'
import { useSettingsStore } from '@/store/settings-store'

// Terrain geometry is cached between island visits, so its material must
// outlive the mesh as well: the mesh is rendered with dispose={null}.
const TERRAIN_MATERIAL = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })

export interface EnvironmentProps {
  shadows: boolean
  island: IslandDefinition
  terrain: Terrain
}

/** Decorative instanced vegetation: trees, rocks, grass tufts, flowers. */
export function Vegetation({ shadows, island, terrain }: EnvironmentProps) {
  const quality = useSettingsStore((s) => s.quality)

  // Deterministic and cached per island, so travel does not re-scatter it.
  const data = useMemo(() => getVegetationData(island, terrain), [island, terrain])

  const qualityScale = quality === 'low' ? 0.45 : quality === 'medium' ? 0.75 : 1
  const trim = <T,>(items: T[], factor: number): T[] =>
    factor >= 1 ? items : items.filter((_, index) => index % Math.round(1 / factor) === 0)

  return (
    <group>
      {/* Tree trunks */}
      <InstancedProp
        instances={data.trunks}
        geometry={Geometries.trunk()}
        material={matteMaterial('trunk', PROP_COLORS.trunk)}
        castShadow={shadows}
      />
      {/* Lower canopy */}
      <InstancedProp
        instances={data.canopies}
        geometry={Geometries.canopyCone()}
        material={matteMaterial('leaf-b', PROP_COLORS.leafB)}
        castShadow={shadows}
      />
      {/* Upper canopy, offset for a fuller silhouette */}
      <InstancedProp
        instances={data.canopies.map((item, index) => ({
          ...item,
          position: [item.position[0], item.position[1] + 0.95, item.position[2]] as [
            number,
            number,
            number,
          ],
          scale: item.scale * 0.7,
          rotationY: item.rotationY + index * 0.37,
        }))}
        geometry={Geometries.canopyCone()}
        material={matteMaterial('leaf-a', PROP_COLORS.leafA)}
        castShadow={shadows}
      />
      {/* Rocks */}
      <InstancedProp
        instances={data.rocks}
        geometry={Geometries.rock()}
        material={matteMaterial('rock', PROP_COLORS.rock)}
        castShadow={shadows}
      />
      {/* Grass tufts */}
      <InstancedProp
        instances={trim(data.grass, qualityScale)}
        geometry={Geometries.grassBlade()}
        material={matteMaterial('grass', '#4f8b3c')}
        castShadow={false}
        receiveShadow={false}
      />
      {/* Flowers */}
      <InstancedProp
        instances={trim(data.flowers, qualityScale)}
        geometry={Geometries.flowerHead()}
        material={matteMaterial('flower', PROP_COLORS.sun)}
        castShadow={false}
        receiveShadow={false}
      />
    </group>
  )
}

/**
 * The island surface. Geometry is built once per island and cached, so
 * travelling back to an island reuses the same buffers.
 */
export function Terrain({ terrain }: EnvironmentProps) {
  const quality = useSettingsStore((s) => s.quality)
  const geometry = useMemo(
    () => terrain.buildGeometry(TERRAIN_SEGMENTS[quality]),
    [terrain, quality],
  )

  return (
    <mesh geometry={geometry} material={TERRAIN_MATERIAL} receiveShadow castShadow dispose={null} />
  )
}

/** Flat-shaded path discs following the footpath samples, in one draw call. */
export function IslandPath({ island, terrain }: EnvironmentProps) {
  const instances = useMemo(() => {
    const points = terrain.samplePath(island.path, 10)
    return points.map((point, index) => ({
      position: [point.x, point.y + 0.06, point.z] as [number, number, number],
      rotationY: (index % 5) * 0.6,
      scale: 1.15,
    }))
  }, [island, terrain])

  const material = useMemo(
    () => matteMaterial('path', PROP_COLORS.path, undefined, island.id),
    [island.id],
  )

  return (
    <InstancedProp
      instances={instances}
      geometry={Geometries.pathDisc()}
      material={material}
      castShadow={false}
      receiveShadow
    />
  )
}

/** Animated water plane surrounding the island. */
export function Water({ island }: EnvironmentProps) {
  // Ring radii follow the island, so a smaller island gets a proportionally
  // tighter shelf and foam line instead of two rings hanging in open water.
  const { radius, palette } = island

  const materials = useMemo(() => {
    const deep = new THREE.MeshLambertMaterial({
      color: palette.water,
      transparent: true,
      opacity: 0.9,
    })
    const shallow = matteMaterial(
      'shallow',
      palette.waterShallow,
      { transparent: true, opacity: 0.6 },
      island.id,
    )
    const foam = matteMaterial('foam', '#dff3ee', { transparent: true, opacity: 0.45 }, island.id)
    return { deep, shallow, foam }
  }, [island.id, palette])

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.55, 0]}
        material={materials.deep}
        receiveShadow
      >
        <planeGeometry args={[900, 900, 1, 1]} />
      </mesh>
      {/* Lighter shelf around the island to suggest shallow water */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.44, 0]} material={materials.shallow}>
        <ringGeometry args={[radius * 0.91, radius * 1.65, 56]} />
      </mesh>
      {/* Foam line hugging the shoreline */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} material={materials.foam}>
        <ringGeometry args={[radius * 0.99, radius * 1.065, 56]} />
      </mesh>
    </group>
  )
}

/** Unstyled but pleasant sky dome with a time-of-day gradient. */
export function SkyDome({ top, bottom }: { top: string; bottom: string }) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(top) },
        bottomColor: { value: new THREE.Color(bottom) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          float t = clamp(h * 0.5 + 0.5, 0.0, 1.0);
          gl_FragColor = vec4(mix(bottomColor, topColor, pow(t, 0.85)), 1.0);
        }
      `,
    })
  }, [top, bottom])

  return (
    <mesh material={material} frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[480, 32, 20]} />
    </mesh>
  )
}
