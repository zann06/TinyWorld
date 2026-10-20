import { useMemo } from 'react'
import * as THREE from 'three'
import type { IslandDefinition } from '@/types'
import { InstancedProp } from '@/world/objects/InstancedProp'
import { Geometries } from '@/world/objects/geometry'
import { PROP_COLORS, matteMaterial } from '@/world/objects/materials'
import { scatterInCluster, seededRandom, type Terrain } from '@/world/terrain/terrain'
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

  const data = useMemo(() => {
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

    const build = (
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
      trunks: build(treePoints, [0.85, 1.3], 0, true),
      canopies: build(treePoints, [0.8, 1.35], 2.05, true),
      rocks: build(rockPoints, [0.6, 1.5], 0.15, true),
      grass: build(grassPoints, [0.7, 1.4], 0.25, true),
      flowers: build(flowerPoints, [0.8, 1.5], 0.5, false),
    }
  }, [island, terrain])

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
  const geometry = useMemo(() => terrain.buildGeometry(110), [terrain])

  return (
    <mesh geometry={geometry} material={TERRAIN_MATERIAL} receiveShadow castShadow dispose={null} />
  )
}

/** Flat-shaded path discs following the footpath samples. */
export function IslandPath({ island, terrain }: EnvironmentProps) {
  const points = useMemo(() => terrain.samplePath(island.path, 10), [island, terrain])
  const material = useMemo(
    () => matteMaterial('path', PROP_COLORS.path, undefined, island.id),
    [island.id],
  )

  return (
    <group>
      {points.map((point, index) => (
        <mesh
          key={`path-${index}`}
          geometry={Geometries.pathDisc()}
          material={material}
          position={[point.x, point.y + 0.06, point.z]}
          scale={1.15}
          receiveShadow
          rotation={[0, (index % 5) * 0.6, 0]}
        />
      ))}
    </group>
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
