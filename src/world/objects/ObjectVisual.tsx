import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PROP_COLORS, matteMaterial } from '@/world/objects/materials'
import { useWorldEffects } from '@/world/objects/world-effects'
import { useSettingsStore } from '@/store/settings-store'

/**
 * Landmark models.
 *
 * Each entry builds one recognisable structure from primitives at the origin,
 * with its base sitting at y = 0. The scene places and scales them; this file
 * only describes what the object looks like.
 */

const stone = () => matteMaterial('stone', PROP_COLORS.stone)
const wall = () => matteMaterial('wall', PROP_COLORS.wall)
const wood = () => matteMaterial('wood', PROP_COLORS.wood)
const roof = () => matteMaterial('roof', PROP_COLORS.roof)
const cream = () => matteMaterial('cream', PROP_COLORS.cream)
const trunk = () => matteMaterial('trunk', PROP_COLORS.trunk)

export function Lighthouse() {
  const lampRef = useRef<THREE.Mesh>(null)
  const beamRef = useRef<THREE.Mesh>(null)
  const quality = useSettingsStore((s) => s.quality)

  useFrame((state, delta) => {
    if (lampRef.current) {
      const glow = 0.55 + Math.sin(state.clock.elapsedTime * 1.6) * 0.12
      const material = lampRef.current.material as THREE.MeshBasicMaterial
      material.opacity = glow
    }
    if (beamRef.current && quality !== 'low') {
      beamRef.current.rotation.y += delta * 0.35
    }
  })

  return (
    <group>
      {/* Tapered tower */}
      <mesh position={[0, 3.4, 0]} castShadow material={matteMaterial('lh-tower', '#f4efe2')}>
        <cylinderGeometry args={[0.95, 1.5, 6.8, 14]} />
      </mesh>
      {/* Red bands */}
      <mesh position={[0, 4.6, 0]} castShadow material={roof()}>
        <cylinderGeometry args={[1.16, 1.24, 1.25, 14]} />
      </mesh>
      <mesh position={[0, 2.1, 0]} castShadow material={roof()}>
        <cylinderGeometry args={[1.34, 1.4, 1.1, 14]} />
      </mesh>
      {/* Gallery */}
      <mesh position={[0, 6.9, 0]} castShadow material={stone()}>
        <cylinderGeometry args={[1.35, 1.3, 0.3, 14]} />
      </mesh>
      {/* Lantern room */}
      <mesh position={[0, 7.65, 0]} castShadow material={matteMaterial('lh-glass', '#cfe4e8')}>
        <cylinderGeometry args={[0.78, 0.82, 1.2, 12]} />
      </mesh>
      <mesh ref={lampRef} position={[0, 7.65, 0]}>
        <sphereGeometry args={[0.42, 12, 12]} />
        <meshBasicMaterial color={PROP_COLORS.sun} transparent opacity={0.6} />
      </mesh>
      {/* Rotating beam */}
      {quality !== 'low' ? (
        <mesh ref={beamRef} position={[0, 7.65, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[1.5, 14, 4, 1, true]} />
          <meshBasicMaterial
            color={PROP_COLORS.sun}
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ) : null}
      {/* Roof */}
      <mesh position={[0, 8.5, 0]} castShadow material={roof()}>
        <coneGeometry args={[1.05, 1.1, 12]} />
      </mesh>
      {/* Base plinth */}
      <mesh position={[0, 0.22, 0]} receiveShadow material={stone()}>
        <cylinderGeometry args={[2.1, 2.35, 0.45, 14]} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.95, 1.28]} material={matteMaterial('lh-door', '#6b4a2f')}>
        <boxGeometry args={[0.7, 1.5, 0.18]} />
      </mesh>
    </group>
  )
}

export function Cottage() {
  return (
    <group>
      <mesh position={[0, 1.3, 0]} castShadow receiveShadow material={wall()}>
        <boxGeometry args={[3.4, 2.6, 2.8]} />
      </mesh>
      <mesh position={[0, 3.05, 0]} castShadow material={matteMaterial('roof-moss', '#5d7f45')}>
        <boxGeometry args={[3.9, 0.42, 3.3]} />
      </mesh>
      <mesh position={[0, 3.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow material={roof()}>
        <coneGeometry args={[2.75, 1.6, 4]} />
      </mesh>
      {/* Chimney */}
      <mesh position={[1.1, 4.1, -0.7]} castShadow material={stone()}>
        <boxGeometry args={[0.62, 1.8, 0.62]} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.95, 1.45]} material={matteMaterial('door', '#8a5a33')}>
        <boxGeometry args={[0.85, 1.7, 0.14]} />
      </mesh>
      {/* Windows */}
      <mesh position={[-1.05, 1.6, 1.44]} material={matteMaterial('window', '#bfe0e4')}>
        <boxGeometry args={[0.75, 0.7, 0.1]} />
      </mesh>
      <mesh position={[1.05, 1.6, 1.44]} material={matteMaterial('window', '#bfe0e4')}>
        <boxGeometry args={[0.75, 0.7, 0.1]} />
      </mesh>
      {/* Window box */}
      <mesh position={[0, 1.24, 1.62]} material={matteMaterial('planter', '#a8452f')}>
        <boxGeometry args={[0.9, 0.24, 0.3]} />
      </mesh>
      {/* Log pile */}
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((column) => (
          <mesh
            key={`log-${row}-${column}`}
            position={[-2.1 + column * 0.42, 0.22 + row * 0.38, 0.6]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
            material={trunk()}
          >
            <cylinderGeometry args={[0.2, 0.2, 0.9, 7]} />
          </mesh>
        )),
      )}
    </group>
  )
}

export function Windmill() {
  const sailsRef = useRef<THREE.Group>(null)
  const quality = useSettingsStore((s) => s.quality)

  useFrame((_, delta) => {
    if (!sailsRef.current) return
    sailsRef.current.rotation.z -= delta * 0.42
  })

  return (
    <group>
      <mesh position={[0, 2.5, 0]} castShadow receiveShadow material={cream()}>
        <cylinderGeometry args={[1.15, 1.7, 5, 12]} />
      </mesh>
      <mesh position={[0, 5.15, 0]} castShadow material={roof()}>
        <coneGeometry args={[1.45, 1.5, 12]} />
      </mesh>
      <mesh position={[0, 0.9, 1.5]} material={matteMaterial('door', '#8a5a33')}>
        <boxGeometry args={[0.75, 1.5, 0.14]} />
      </mesh>

      <group ref={sailsRef} position={[0, 4.6, 1.35]} rotation={[0, 0, 0]}>
        {[0, 1, 2, 3].map((blade) => (
          <group key={blade} rotation={[0, 0, (blade * Math.PI) / 2]}>
            <mesh position={[0, 2.2, 0]} castShadow={quality !== 'low'} material={trunk()}>
              <boxGeometry args={[0.16, 4.3, 0.16]} />
            </mesh>
            <mesh position={[0.75, 2.6, 0]} castShadow={quality !== 'low'} material={cream()}>
              <boxGeometry args={[1.4, 2.1, 0.08]} />
            </mesh>
          </group>
        ))}
        <mesh material={matteMaterial('hub', '#6b4a2f')}>
          <sphereGeometry args={[0.32, 10, 10]} />
        </mesh>
      </group>
    </group>
  )
}

export function Dock() {
  const posts = [-1, 0, 1, 2]

  return (
    <group>
      {/* Pier running out over the water */}
      <mesh position={[0, 0.45, 3.2]} castShadow receiveShadow material={wood()}>
        <boxGeometry args={[3.2, 0.22, 7.5]} />
      </mesh>
      {posts.map((z) =>
        [-1, 1].map((side) => (
          <mesh
            key={`post-${z}-${side}`}
            position={[side * 1.35, 0.0, 0.6 + z * 1.9]}
            castShadow
            material={trunk()}
          >
            <cylinderGeometry args={[0.18, 0.2, 1.5, 7]} />
          </mesh>
        )),
      )}
      {/* Plank lines */}
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <mesh
          key={`plank-${index}`}
          position={[0, 0.57, 0.3 + index * 1.15]}
          material={matteMaterial('plank', '#b08f63')}
        >
          <boxGeometry args={[3.0, 0.05, 0.12]} />
        </mesh>
      ))}
      {/* Crates */}
      <mesh position={[-0.7, 1.05, 5.6]} rotation={[0, 0.4, 0]} castShadow material={wood()}>
        <boxGeometry args={[1.0, 0.95, 1.0]} />
      </mesh>
      <mesh
        position={[0.75, 0.9, 5.0]}
        rotation={[0, -0.3, 0]}
        castShadow
        material={matteMaterial('crate2', '#a9793f')}
      >
        <boxGeometry args={[0.85, 0.75, 0.85]} />
      </mesh>
      {/* Mooring post with rope */}
      <mesh position={[1.5, 0.85, 0.4]} castShadow material={trunk()}>
        <cylinderGeometry args={[0.16, 0.18, 1.7, 7]} />
      </mesh>
    </group>
  )
}

export function Signpost() {
  return (
    <group>
      <mesh position={[0, 1.1, 0]} castShadow material={trunk()}>
        <cylinderGeometry args={[0.13, 0.16, 2.2, 7]} />
      </mesh>
      <mesh position={[0.05, 1.85, 0]} castShadow material={matteMaterial('sign', '#d9b97f')}>
        <boxGeometry args={[2.3, 0.72, 0.1]} />
      </mesh>
      <mesh
        position={[-0.45, 1.5, 0.02]}
        rotation={[0, 0, -0.18]}
        castShadow
        material={matteMaterial('sign', '#d9b97f')}
      >
        <boxGeometry args={[1.8, 0.6, 0.09]} />
      </mesh>
      {/* Direction text as simple inset bars */}
      {[0, 1, 2].map((index) => (
        <mesh key={`sign-line-${index}`} position={[0.05, 2.05 - index * 0.19, 0.07]}>
          <boxGeometry args={[1.6 - index * 0.3, 0.07, 0.02]} />
          <meshBasicMaterial color="#5a3d27" />
        </mesh>
      ))}
      {/* Small roof for weather protection */}
      <mesh position={[0.05, 2.35, 0]} rotation={[0, Math.PI / 4, 0]} castShadow material={roof()}>
        <coneGeometry args={[0.42, 0.3, 4]} />
      </mesh>
      {/* Flowers at the base */}
      <mesh position={[0.5, 0.18, 0.4]} castShadow material={matteMaterial('bush', '#4f8b3c')}>
        <icosahedronGeometry args={[0.4, 0]} />
      </mesh>
    </group>
  )
}

export function Watchtower() {
  const lanternRef = useRef<THREE.Mesh>(null)
  const lanternLit = useWorldEffects((s) => s.lanternLit)
  const quality = useSettingsStore((s) => s.quality)

  return (
    <group>
      <mesh position={[0, 2.8, 0]} castShadow receiveShadow material={stone()}>
        <cylinderGeometry args={[1.15, 1.65, 5.6, 8]} />
      </mesh>
      <mesh position={[0, 5.75, 0]} castShadow material={stone()}>
        <cylinderGeometry args={[1.5, 1.45, 0.3, 8]} />
      </mesh>
      {/* Merlon crenellations */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
        const angle = (index / 8) * Math.PI * 2
        return (
          <mesh
            key={`merlon-${index}`}
            position={[Math.cos(angle) * 1.32, 6.15, Math.sin(angle) * 1.32]}
            castShadow
            material={stone()}
          >
            <boxGeometry args={[0.5, 0.55, 0.5]} />
          </mesh>
        )
      })}
      {/* Ivy climbing the base */}
      <mesh position={[0, 0.7, 0.9]} castShadow material={matteMaterial('ivy', '#4f8b3c')}>
        <icosahedronGeometry args={[0.95, 0]} />
      </mesh>
      {/* Lantern */}
      <mesh position={[0, 6.75, 0]} castShadow material={matteMaterial('lantern-cage', '#6b4a2f')}>
        <boxGeometry args={[0.6, 0.75, 0.6]} />
      </mesh>
      <mesh ref={lanternRef} position={[0, 6.75, 0]}>
        <sphereGeometry args={[0.26, 10, 10]} />
        <meshBasicMaterial color={PROP_COLORS.sun} transparent opacity={lanternLit ? 0.95 : 0.18} />
      </mesh>
      {lanternLit && quality !== 'low' ? (
        <pointLight
          position={[0, 6.8, 0]}
          color={PROP_COLORS.sun}
          intensity={6}
          distance={14}
          decay={2}
        />
      ) : null}
      {/* Wooden ladder */}
      {[0, 1, 2, 3, 4].map((index) => (
        <mesh key={`rung-${index}`} position={[0, 0.6 + index * 1.1, 1.72]} material={trunk()}>
          <boxGeometry args={[0.8, 0.1, 0.1]} />
        </mesh>
      ))}
    </group>
  )
}

export function Garden() {
  const fencePosts = Array.from({ length: 16 }, (_, index): readonly [number, number] => {
    const angle = (index / 16) * Math.PI * 2
    return [Math.cos(angle) * 4.6, Math.sin(angle) * 4.6]
  })

  return (
    <group>
      {/* Fence ring */}
      {fencePosts.map(([x, z], index) => (
        <mesh key={`fence-${index}`} position={[x, 0.55, z]} castShadow material={wood()}>
          <boxGeometry args={[0.16, 1.1, 0.16]} />
        </mesh>
      ))}
      {fencePosts.map(([x, z], index) => {
        const next = fencePosts[(index + 1) % fencePosts.length]
        if (!next) return null
        const [nx, nz] = next
        const midX = (x + nx) / 2
        const midZ = (z + nz) / 2
        const angle = Math.atan2(nz - z, nx - x)
        const length = Math.hypot(nx - x, nz - z)
        return (
          <mesh
            key={`rail-${index}`}
            position={[midX, 0.88, midZ]}
            rotation={[0, -angle, 0]}
            material={matteMaterial('rail', '#8a5a33')}
          >
            <boxGeometry args={[length, 0.1, 0.08]} />
          </mesh>
        )
      })}

      {/* Four vegetable beds */}
      {(
        [
          [-2, -1.6],
          [2, -1.6],
          [-2, 1.6],
          [2, 1.6],
        ] as const
      ).map(([x, z], index) => (
        <group key={`bed-${index}`} position={[x, 0, z]}>
          <mesh position={[0, 0.12, 0]} receiveShadow material={matteMaterial('soil', '#6b4a2f')}>
            <boxGeometry args={[2.8, 0.24, 2.0]} />
          </mesh>
          {[0, 1, 2].map((row) =>
            [-1, 0, 1].map((column) => (
              <mesh
                key={`crop-${row}-${column}`}
                position={[-1 + column, 0.42, -0.6 + row * 0.6]}
                castShadow
                material={matteMaterial('crop', index % 2 === 0 ? '#7fae5c' : '#8bbd6f')}
              >
                <icosahedronGeometry args={[0.26, 0]} />
              </mesh>
            )),
          )}
        </group>
      ))}

      {/* Watering can */}
      <mesh
        position={[3.4, 0.3, 2.4]}
        rotation={[0, 0.4, 0]}
        castShadow
        material={matteMaterial('can', '#7f9aa8')}
      >
        <cylinderGeometry args={[0.26, 0.3, 0.5, 10]} />
      </mesh>
    </group>
  )
}

export function Camp() {
  const fireStoked = useWorldEffects((s) => s.fireStoked)
  const flameRef = useRef<THREE.Group>(null)
  const quality = useSettingsStore((s) => s.quality)

  useFrame((state) => {
    if (!flameRef.current) return
    const t = state.clock.elapsedTime
    const flicker = 0.9 + Math.sin(t * 11) * 0.09 + Math.sin(t * 17.3) * 0.05
    flameRef.current.scale.setScalar(fireStoked ? flicker * 1.35 : flicker * 0.72)
    flameRef.current.visible = fireStoked
  })

  return (
    <group>
      {/* Tent */}
      <mesh
        position={[1.4, 1.05, -0.4]}
        rotation={[0, 0.5, 0]}
        castShadow
        receiveShadow
        material={matteMaterial('tent', '#d9c08a')}
      >
        <coneGeometry args={[1.7, 2.1, 4]} />
      </mesh>
      <mesh
        position={[1.4, 1.05, -0.4]}
        rotation={[0, 0.5, Math.PI / 4]}
        castShadow
        material={matteMaterial('tent-dark', '#c2a874')}
      >
        <coneGeometry args={[1.72, 2.15, 4]} />
      </mesh>
      <mesh
        position={[0.95, 0.5, 0.55]}
        rotation={[0, 0.5, 0]}
        material={matteMaterial('tent-door', '#5a3d27')}
      >
        <coneGeometry args={[0.7, 1.15, 3]} />
      </mesh>

      {/* Fire ring */}
      {[0, 1, 2, 3, 4, 5].map((index) => {
        const angle = (index / 6) * Math.PI * 2
        return (
          <mesh
            key={`fire-stone-${index}`}
            position={[Math.cos(angle) * 0.75, 0.12, Math.sin(angle) * 0.75 - 1.8]}
            castShadow
            material={stone()}
          >
            <dodecahedronGeometry args={[0.26, 0]} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.12, -1.8]} rotation={[0.3, 0.4, 0]} castShadow material={trunk()}>
        <cylinderGeometry args={[0.12, 0.12, 1.1, 6]} />
      </mesh>
      <mesh
        position={[0.2, 0.1, -1.8]}
        rotation={[0, -0.6, 0.3]}
        castShadow
        material={matteMaterial('log2', '#5a3d27')}
      >
        <cylinderGeometry args={[0.12, 0.12, 1.1, 6]} />
      </mesh>

      <group ref={flameRef} position={[0, 0.45, -1.8]}>
        <mesh>
          <coneGeometry args={[0.42, 1.05, 6]} />
          <meshBasicMaterial color="#f2a03f" transparent opacity={0.92} />
        </mesh>
        <mesh position={[0, -0.15, 0]}>
          <coneGeometry args={[0.24, 0.62, 6]} />
          <meshBasicMaterial color="#ffd77a" transparent opacity={0.95} />
        </mesh>
      </group>

      {fireStoked && quality !== 'low' ? (
        <pointLight
          position={[0, 1.1, -1.8]}
          color="#f2a03f"
          intensity={9}
          distance={16}
          decay={2}
        />
      ) : null}

      {/* Log seat */}
      <mesh position={[-2.4, 0.3, -0.6]} rotation={[0, 0.3, 0]} castShadow material={trunk()}>
        <cylinderGeometry args={[0.28, 0.28, 2.4, 8]} />
      </mesh>
    </group>
  )
}

export function Arch() {
  const blocks = 9

  return (
    <group>
      {[0, 1].map((side) => (
        <group key={`leg-${side}`} position={[side === 0 ? -1.5 : 1.5, 0, 0]}>
          {[0, 1, 2, 3].map((index) => (
            <mesh
              key={`stack-${index}`}
              position={[0, 0.5 + index * 0.9, 0]}
              rotation={[0, index * 0.22, 0]}
              castShadow
              receiveShadow
              material={stone()}
            >
              <boxGeometry args={[1.35 - index * 0.09, 0.86, 1.5 - index * 0.08]} />
            </mesh>
          ))}
        </group>
      ))}
      {Array.from({ length: blocks }, (_, index) => {
        const t = (index + 0.5) / blocks
        const angle = Math.PI * t
        return (
          <mesh
            key={`keystone-${index}`}
            position={[Math.cos(angle) * 1.5, 4.3 + Math.sin(angle) * 1.5, 0]}
            rotation={[0, 0, angle - Math.PI / 2]}
            castShadow
            material={matteMaterial('arch-rock', '#9c968a')}
          >
            <boxGeometry args={[0.62, 0.95, 1.45]} />
          </mesh>
        )
      })}
      {/* Moss cap */}
      <mesh position={[0, 5.85, 0]} castShadow material={matteMaterial('arch-moss', '#5d7f45')}>
        <boxGeometry args={[1.4, 0.35, 1.5]} />
      </mesh>
    </group>
  )
}

export function Spring() {
  const springTouched = useWorldEffects((s) => s.springTouched)
  const rippleRef = useRef<THREE.Mesh>(null)
  const quality = useSettingsStore((s) => s.quality)

  useFrame((state, delta) => {
    if (!rippleRef.current || !springTouched) return
    const mesh = rippleRef.current
    mesh.visible = true
    const next = (mesh.scale.x + delta * 0.55) % 1.6
    mesh.scale.setScalar(0.35 + next)
    const material = mesh.material as THREE.MeshBasicMaterial
    material.opacity = Math.max(0, 0.55 - next * 0.35)
    mesh.rotation.y = state.clock.elapsedTime * 0.6
  })

  return (
    <group>
      {/* Water pool */}
      <mesh position={[0, 0.18, 0]} receiveShadow>
        <cylinderGeometry args={[2.3, 2.1, 0.3, 18]} />
        <meshLambertMaterial color={PROP_COLORS.water} />
      </mesh>
      <mesh ref={rippleRef} position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.8, 1.0, 20]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* Rock rim */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => {
        const angle = (index / 10) * Math.PI * 2
        return (
          <mesh
            key={`rim-${index}`}
            position={[Math.cos(angle) * 2.35, 0.2, Math.sin(angle) * 2.35]}
            rotation={[0.2, angle, 0.1]}
            castShadow
            receiveShadow
            material={matteMaterial('rim-rock', '#9c968a')}
          >
            <dodecahedronGeometry args={[0.5, 0]} />
          </mesh>
        )
      })}
      {/* Pebble offering stone */}
      <mesh
        position={[2.9, 0.16, 1.4]}
        receiveShadow
        material={matteMaterial('flat-stone', '#a9a396')}
      >
        <cylinderGeometry args={[1.05, 1.15, 0.3, 7]} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((index) => {
        const angle = (index / 6) * Math.PI * 2
        return (
          <mesh
            key={`pebble-${index}`}
            position={[2.9 + Math.cos(angle) * 0.55, 0.36, 1.4 + Math.sin(angle) * 0.55]}
            castShadow={quality !== 'low'}
            material={matteMaterial('pebble', '#b9b3a4')}
          >
            <icosahedronGeometry args={[0.14, 0]} />
          </mesh>
        )
      })}
      {/* Reeds */}
      {[0, 1, 2, 3, 4].map((index) => (
        <mesh
          key={`reed-${index}`}
          position={[-2.1 + index * 0.32, 0.7, -1.4 + (index % 2) * 0.4]}
          castShadow
          material={matteMaterial('reed', '#6a994e')}
        >
          <coneGeometry args={[0.08, 1.3, 4]} />
        </mesh>
      ))}
    </group>
  )
}
