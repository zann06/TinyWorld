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

/** Slow chimney smoke that fades out as it rises. */
function ChimneySmoke({ position }: { position: [number, number, number] }) {
  const puffs = useRef<(THREE.Mesh | null)[]>([])
  const quality = useSettingsStore((s) => s.quality)
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)

  useFrame((state) => {
    if (quality === 'low' || reducedMotion) return
    const t = state.clock.elapsedTime
    for (let index = 0; index < puffs.current.length; index += 1) {
      const puff = puffs.current[index]
      if (!puff) continue
      const cycle = (t * 0.22 + index / puffs.current.length) % 1
      puff.position.set(
        Math.sin(cycle * 4 + index) * 0.24,
        cycle * 2.4,
        Math.cos(cycle * 3 + index) * 0.16,
      )
      puff.scale.setScalar(0.2 + cycle * 0.55)
      const material = puff.material as THREE.MeshBasicMaterial
      material.opacity = (1 - cycle) * 0.16
    }
  })

  if (quality === 'low' || reducedMotion) return null

  return (
    <group position={position}>
      {[0, 1, 2, 3].map((index) => (
        <mesh
          key={`smoke-${index}`}
          ref={(mesh) => {
            puffs.current[index] = mesh
          }}
        >
          <sphereGeometry args={[1, 7, 6]} />
          <meshBasicMaterial color="#e8e2d6" transparent opacity={0.12} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** A warm pane that only appears at dusk and night. */
function WindowGlow({
  position,
  size = [0.62, 0.58],
}: {
  position: [number, number, number]
  size?: [number, number]
}) {
  const timeOfDay = useSettingsStore((s) => s.timeOfDay)
  if (timeOfDay === 'day') return null

  return (
    <mesh position={position}>
      <boxGeometry args={[size[0], size[1], 0.03]} />
      <meshBasicMaterial
        color="#ffd58a"
        transparent
        opacity={timeOfDay === 'night' ? 0.65 : 0.4}
        depthWrite={false}
      />
    </mesh>
  )
}

/** A small hanging lamp for doorways and mooring posts. */
function HangingLantern({ position }: { position: [number, number, number] }) {
  const timeOfDay = useSettingsStore((s) => s.timeOfDay)
  const lit = timeOfDay !== 'day'

  return (
    <group position={position}>
      <mesh position={[0, 0.38, 0]} material={trunk()}>
        <cylinderGeometry args={[0.025, 0.025, 0.7, 5]} />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow material={matteMaterial('lantern-iron', '#4c4a45')}>
        <boxGeometry args={[0.24, 0.3, 0.24]} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.15, 0.2, 0.15]} />
        <meshBasicMaterial color="#ffd58a" transparent opacity={lit ? 0.95 : 0.32} />
      </mesh>
    </group>
  )
}

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
      {/* Gallery and its railing */}
      <mesh position={[0, 6.9, 0]} castShadow material={stone()}>
        <cylinderGeometry args={[1.35, 1.3, 0.3, 14]} />
      </mesh>
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2
        return (
          <mesh
            key={`lh-post-${index}`}
            position={[Math.sin(angle) * 1.26, 7.3, Math.cos(angle) * 1.26]}
            castShadow
            material={matteMaterial('lh-rail', '#4c4a45')}
          >
            <cylinderGeometry args={[0.035, 0.045, 0.58, 5]} />
          </mesh>
        )
      })}
      <mesh
        position={[0, 7.58, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        material={matteMaterial('lh-rail', '#4c4a45')}
      >
        <torusGeometry args={[1.26, 0.035, 5, 20]} />
      </mesh>
      {/* Narrow tower windows */}
      {[0.5, 1.7, 2.9].map((angle) => (
        <mesh
          key={`lh-window-low-${angle}`}
          position={[Math.sin(angle) * 1.3, 3.35, Math.cos(angle) * 1.3]}
          rotation={[0, angle, 0]}
          material={matteMaterial('window-dark', '#27302f')}
        >
          <boxGeometry args={[0.16, 0.36, 0.08]} />
        </mesh>
      ))}
      {[0.9, 2.35].map((angle) => (
        <mesh
          key={`lh-window-high-${angle}`}
          position={[Math.sin(angle) * 1.16, 5.45, Math.cos(angle) * 1.16]}
          rotation={[0, angle, 0]}
          material={matteMaterial('window-dark', '#27302f')}
        >
          <boxGeometry args={[0.14, 0.3, 0.08]} />
        </mesh>
      ))}
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
      {/* Door and step */}
      <mesh position={[0, 0.95, 1.28]} material={matteMaterial('lh-door', '#6b4a2f')}>
        <boxGeometry args={[0.7, 1.5, 0.18]} />
      </mesh>
      <mesh position={[0, 0.08, 1.52]} receiveShadow material={stone()}>
        <boxGeometry args={[1.1, 0.16, 0.6]} />
      </mesh>
    </group>
  )
}

export function Cottage() {
  return (
    <group>
      <mesh position={[0, 0.16, 0]} receiveShadow material={stone()}>
        <boxGeometry args={[3.62, 0.32, 3.02]} />
      </mesh>
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
      {/* Door and frame */}
      <mesh position={[0, 0.95, 1.45]} material={matteMaterial('door', '#8a5a33')}>
        <boxGeometry args={[0.85, 1.7, 0.14]} />
      </mesh>
      {[-0.5, 0.5].map((x) => (
        <mesh key={`door-post-${x}`} position={[x, 0.95, 1.47]} material={wood()}>
          <boxGeometry args={[0.12, 1.82, 0.18]} />
        </mesh>
      ))}
      <mesh position={[0, 1.86, 1.47]} material={wood()}>
        <boxGeometry args={[1.12, 0.14, 0.18]} />
      </mesh>
      <mesh position={[0, 0.08, 1.62]} receiveShadow material={stone()}>
        <boxGeometry args={[1.2, 0.16, 0.55]} />
      </mesh>
      {/* Windows, shutters and warm evening light */}
      {[-1.05, 1.05].map((x) => (
        <group key={`window-${x}`} position={[x, 1.6, 1.44]}>
          <mesh material={matteMaterial('window', '#bfe0e4')}>
            <boxGeometry args={[0.75, 0.7, 0.1]} />
          </mesh>
          <mesh position={[0, 0, 0.06]} material={matteMaterial('window-frame', '#6b4a2f')}>
            <boxGeometry args={[0.09, 0.74, 0.05]} />
          </mesh>
          <mesh position={[0, 0, 0.06]} material={matteMaterial('window-frame', '#6b4a2f')}>
            <boxGeometry args={[0.79, 0.08, 0.05]} />
          </mesh>
          <WindowGlow position={[0, 0, 0.09]} />
        </group>
      ))}
      {[-1.53, -0.57, 0.57, 1.53].map((x) => (
        <mesh
          key={`shutter-${x}`}
          position={[x, 1.6, 1.46]}
          material={matteMaterial('shutter', '#4f6b4a')}
        >
          <boxGeometry args={[0.16, 0.74, 0.08]} />
        </mesh>
      ))}
      {/* Window boxes with a little colour */}
      {[-1.05, 1.05].map((x) => (
        <group key={`planter-${x}`} position={[x, 1.2, 1.62]}>
          <mesh material={matteMaterial('planter', '#a8452f')}>
            <boxGeometry args={[0.9, 0.24, 0.3]} />
          </mesh>
          {[-0.26, 0, 0.26].map((offset, index) => (
            <mesh
              key={`flower-${offset}`}
              position={[offset, 0.18, 0.02]}
              material={matteMaterial(
                index === 1 ? 'flower-sun' : 'flower-rose',
                index === 1 ? '#e9b949' : '#c85a4a',
              )}
            >
              <sphereGeometry args={[0.09, 6, 5]} />
            </mesh>
          ))}
        </group>
      ))}
      <ChimneySmoke position={[1.1, 5.0, -0.7]} />
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
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)

  useFrame((_, delta) => {
    if (!sailsRef.current || reducedMotion) return
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
      <mesh position={[0, 0.08, 1.7]} receiveShadow material={stone()}>
        <boxGeometry args={[1.1, 0.16, 0.6]} />
      </mesh>
      {/* Gallery deck and railing */}
      <mesh position={[0, 3.35, 0]} castShadow material={wood()}>
        <cylinderGeometry args={[1.55, 1.6, 0.18, 12]} />
      </mesh>
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2
        return (
          <mesh
            key={`wm-post-${index}`}
            position={[Math.cos(angle) * 1.47, 3.72, Math.sin(angle) * 1.47]}
            castShadow
            material={trunk()}
          >
            <cylinderGeometry args={[0.04, 0.05, 0.62, 5]} />
          </mesh>
        )
      })}
      <mesh
        position={[0, 4.02, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        material={matteMaterial('wm-rail', '#8a5a33')}
      >
        <torusGeometry args={[1.47, 0.04, 5, 20]} />
      </mesh>
      {/* Sacks of flour by the door */}
      {(
        [
          [-1.45, 0.38, 1.1, 0.5],
          [-1.1, 0.32, 1.42, 0.4],
          [1.35, 0.34, 1.25, 0.45],
        ] as const
      ).map(([x, y, z, scale], index) => (
        <mesh
          key={`sack-${index}`}
          position={[x, y, z]}
          scale={[scale, scale * 1.25, scale * 0.9]}
          rotation={[0, index * 0.7, 0]}
          castShadow
          material={matteMaterial('sack', '#d9b97f')}
        >
          <icosahedronGeometry args={[0.72, 1]} />
        </mesh>
      ))}
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
      {/* Mooring post and rails */}
      <mesh position={[1.5, 0.85, 0.4]} castShadow material={trunk()}>
        <cylinderGeometry args={[0.16, 0.18, 1.7, 7]} />
      </mesh>
      {[0, 1, 2].map((index) => (
        <mesh
          key={`rope-${index}`}
          position={[0, 0.98, 1.55 + index * 1.9]}
          rotation={[Math.PI / 2, 0, 0]}
          material={matteMaterial('rope', '#c2a874')}
        >
          <cylinderGeometry args={[0.028, 0.028, 1.9, 5]} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={`dock-rail-${side}`}
          position={[side * 1.35, 1.05, 1.55]}
          rotation={[Math.PI / 2, 0, 0]}
          material={matteMaterial('rope', '#c2a874')}
        >
          <cylinderGeometry args={[0.03, 0.03, 5.7, 5]} />
        </mesh>
      ))}
      {/* Coiled rope and a spare barrel */}
      <mesh
        position={[-0.55, 0.63, 1.1]}
        rotation={[Math.PI / 2, 0, 0]}
        material={matteMaterial('rope', '#c2a874')}
      >
        <torusGeometry args={[0.36, 0.07, 6, 14]} />
      </mesh>
      <mesh position={[1.15, 0.88, 3.5]} castShadow material={matteMaterial('barrel', '#7a4b32')}>
        <cylinderGeometry args={[0.36, 0.34, 0.78, 10]} />
      </mesh>
      <mesh position={[1.15, 0.88, 3.5]} material={matteMaterial('barrel-band', '#4c4a45')}>
        <cylinderGeometry args={[0.37, 0.37, 0.08, 10]} />
      </mesh>
      {/* Oars leaning by the crates */}
      {[0, 1].map((index) => (
        <group
          key={`oar-${index}`}
          position={[0.85 + index * 0.22, 1.05, 5.45]}
          rotation={[0.14, 0, -0.3]}
        >
          <mesh castShadow material={trunk()}>
            <cylinderGeometry args={[0.05, 0.06, 2.2, 6]} />
          </mesh>
          <mesh position={[0, -0.95, 0]} material={wood()}>
            <boxGeometry args={[0.05, 0.55, 0.3]} />
          </mesh>
        </group>
      ))}
      <HangingLantern position={[1.5, 1.7, 0.4]} />
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
      {/* Watch banner */}
      <mesh position={[1.05, 7.65, -0.3]} castShadow material={trunk()}>
        <cylinderGeometry args={[0.045, 0.06, 2.1, 6]} />
      </mesh>
      <mesh position={[1.38, 8.35, -0.3]} material={matteMaterial('watch-banner', '#a8452f')}>
        <boxGeometry args={[0.62, 0.5, 0.035]} />
      </mesh>
      <mesh position={[1.38, 8.58, -0.28]} material={matteMaterial('watch-banner-trim', '#d9c08a')}>
        <boxGeometry args={[0.66, 0.07, 0.045]} />
      </mesh>
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

/**
 * Cairnmoor landmarks.
 *
 * Everything the sea left behind rather than everything people built to stay,
 * so the silhouette language is ribs, stacked stone and tarred plank instead of
 * towers and pitched roofs.
 */

/** The Gullwing Wreck — a hull on its side, ribs exposed, mast down in the sand. */
export function Wreck() {
  const quality = useSettingsStore((state) => state.quality)
  const ribs = [-2.6, -1.7, -0.8, 0.1, 1, 1.9, 2.7]

  return (
    <group rotation={[0, 0.35, 0]}>
      {/* Keel, rolled onto its side */}
      <mesh
        position={[0, 0.75, 0]}
        rotation={[0, 0, 0.22]}
        castShadow
        receiveShadow
        material={matteMaterial('wreck-hull', '#6b5a48')}
      >
        <boxGeometry args={[1.5, 0.9, 7.2]} />
      </mesh>
      {/* Planking strakes along the exposed side */}
      {[0, 1, 2].map((index) => (
        <mesh
          key={`strake-${index}`}
          position={[-0.1 - index * 0.32, 0.95 + index * 0.18, 0]}
          rotation={[0, 0, 0.22]}
          castShadow
          material={matteMaterial('wreck-strake', index % 2 === 0 ? '#7a6752' : '#5f4f3f')}
        >
          <boxGeometry args={[0.16, 0.5, 6.6]} />
        </mesh>
      ))}
      {/* Ribs arching out of the sand */}
      {ribs.map((z, index) => (
        <group key={`rib-${index}`} position={[0, 0, z]} rotation={[0, 0, -0.28]}>
          <mesh
            position={[0.95, 1.5, 0]}
            castShadow
            material={matteMaterial('wreck-rib', '#8a7561')}
          >
            <boxGeometry args={[0.22, 2.5, 0.3]} />
          </mesh>
          <mesh
            position={[1.85, 0.75, 0]}
            castShadow
            material={matteMaterial('wreck-rib', '#8a7561')}
          >
            <boxGeometry args={[0.22, 1.9, 0.3]} />
          </mesh>
        </group>
      ))}
      {/* Fallen mast, parallel to the beach */}
      <mesh
        position={[-2.6, 0.32, 0.6]}
        rotation={[0, 0.12, Math.PI / 2]}
        castShadow
        material={matteMaterial('wreck-mast', '#7a6752')}
      >
        <cylinderGeometry args={[0.17, 0.22, 8.4, 7]} />
      </mesh>
      {/* Torn sail bundled against the hull */}
      <mesh
        position={[-1.6, 0.42, -2.2]}
        rotation={[0, 0.4, 0.1]}
        castShadow
        material={matteMaterial('wreck-sail', '#cdbfa4')}
      >
        <sphereGeometry args={[0.95, 8, 6]} />
      </mesh>
      {/* Bow post still standing */}
      <mesh
        position={[0.3, 2.1, 3.7]}
        rotation={[0.2, 0, -0.22]}
        castShadow
        material={matteMaterial('wreck-rib', '#8a7561')}
      >
        <boxGeometry args={[0.26, 3.1, 0.34]} />
      </mesh>
      {/* Barnacled rocks holding her down */}
      {[0, 1, 2, 3].map((index) => {
        const angle = index * 1.7
        return (
          <mesh
            key={`wreck-rock-${index}`}
            position={[Math.cos(angle) * 3.1, 0.2, Math.sin(angle) * 2.6]}
            castShadow={quality !== 'low'}
            material={matteMaterial('wreck-rock', '#7f7d76')}
          >
            <icosahedronGeometry args={[0.5 + (index % 2) * 0.18, 0]} />
          </mesh>
        )
      })}
    </group>
  )
}

/** The Watcher's Cairn — stacked stones with several flat markers turned outward. */
export function Cairn() {
  const quality = useSettingsStore((state) => state.quality)

  // Deliberately irregular: a hand-stacked pile, not a cone.
  const stones = [
    { x: 0, y: 0.32, z: 0, r: 1.15, s: 0.62 },
    { x: 0.08, y: 0.85, z: 0.05, r: 0.95, s: 0.56 },
    { x: -0.1, y: 1.32, z: -0.04, r: 0.82, s: 0.5 },
    { x: 0.05, y: 1.72, z: 0.06, r: 0.68, s: 0.44 },
    { x: -0.03, y: 2.05, z: 0, r: 0.52, s: 0.38 },
    { x: 0.02, y: 2.3, z: 0.02, r: 0.34, s: 0.3 },
  ]

  return (
    <group>
      {stones.map((stone, index) => (
        <mesh
          key={`cairn-${index}`}
          position={[stone.x, stone.y, stone.z]}
          rotation={[0, index * 0.9, 0]}
          castShadow
          receiveShadow
          material={matteMaterial(
            index % 2 === 0 ? 'cairn-a' : 'cairn-b',
            index % 2 === 0 ? '#9a998f' : '#84837a',
          )}
        >
          <dodecahedronGeometry args={[stone.r * stone.s, 0]} />
        </mesh>
      ))}
      {/* Several flat marker stones, each turned to face the water */}
      {[0, 1, 2, 3].map((index) => {
        const angle = index * (Math.PI / 2) + 0.35
        return (
          <mesh
            key={`marker-${index}`}
            position={[Math.cos(angle) * 1.5, 0.34, Math.sin(angle) * 1.5]}
            rotation={[0, -angle + Math.PI / 2, 0.12]}
            castShadow={quality !== 'low'}
            material={matteMaterial('cairn-marker', '#b0aea1')}
          >
            <boxGeometry args={[0.95, 0.72, 0.22]} />
          </mesh>
        )
      })}
      {/* Loose stones scattered by everyone who added one */}
      {[0, 1, 2, 3, 4, 5].map((index) => {
        const angle = index * 1.05 + 0.6
        return (
          <mesh
            key={`loose-${index}`}
            position={[
              Math.cos(angle) * (2.1 + index * 0.12),
              0.16,
              Math.sin(angle) * (2.1 + index * 0.12),
            ]}
            castShadow={quality !== 'low'}
            material={matteMaterial('cairn-loose', '#8f8e84')}
          >
            <icosahedronGeometry args={[0.22 + (index % 3) * 0.05, 0]} />
          </mesh>
        )
      })}
    </group>
  )
}

/**
 * Hearthfall landmarks.
 *
 * The visual language is the first settlement rather than the later one: earth,
 * fire-blackened stone, carved records and a bell that was never meant to be
 * decorative.
 */

/** The First Hearth — a scorched stone ring with a tripod and a rekindled fire. */
export function Hearth() {
  const fireStoked = useWorldEffects((s) => s.fireStoked)
  const flameRef = useRef<THREE.Group>(null)
  const quality = useSettingsStore((s) => s.quality)

  useFrame((state) => {
    if (!flameRef.current) return
    const t = state.clock.elapsedTime
    const flicker = 0.9 + Math.sin(t * 9.5) * 0.08 + Math.sin(t * 15.7) * 0.04
    flameRef.current.scale.setScalar(fireStoked ? flicker * 1.2 : flicker * 0.6)
    flameRef.current.visible = fireStoked
  })

  const hearthStones = Array.from({ length: 9 }, (_, index) => {
    const angle = (index / 9) * Math.PI * 2
    return { angle, x: Math.cos(angle) * 1.25, z: Math.sin(angle) * 1.25 }
  })

  return (
    <group>
      {/* Fire-blackened ring */}
      {hearthStones.map((stone, index) => (
        <mesh
          key={`hearth-stone-${index}`}
          position={[stone.x, 0.22, stone.z]}
          rotation={[0.1, stone.angle, index % 2 === 0 ? 0.08 : -0.05]}
          castShadow
          receiveShadow
          material={matteMaterial(index % 2 === 0 ? 'hearth-stone-a' : 'hearth-stone-b', '#6f6a60')}
        >
          <dodecahedronGeometry args={[0.34, 0]} />
        </mesh>
      ))}

      {/* Ash bed */}
      <mesh position={[0, 0.08, 0]} receiveShadow material={matteMaterial('hearth-ash', '#8a8175')}>
        <cylinderGeometry args={[1.02, 1.08, 0.16, 14]} />
      </mesh>

      {/* Tripod over the fire */}
      {[0, 1, 2].map((index) => {
        const angle = (index / 3) * Math.PI * 2
        return (
          <mesh
            key={`hearth-pole-${index}`}
            position={[Math.cos(angle) * 0.8, 1.05, Math.sin(angle) * 0.8]}
            rotation={[Math.sin(angle) * 0.35, 0, -Math.cos(angle) * 0.35]}
            castShadow
            material={trunk()}
          >
            <cylinderGeometry args={[0.055, 0.075, 2.2, 6]} />
          </mesh>
        )
      })}
      <mesh position={[0, 2.12, 0]} castShadow material={matteMaterial('hearth-iron', '#4c4a45')}>
        <cylinderGeometry args={[0.08, 0.08, 0.9, 8]} />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow material={matteMaterial('hearth-pot', '#5e5a52')}>
        <sphereGeometry args={[0.34, 10, 8]} />
      </mesh>

      {/* Banked embers, always present */}
      <mesh position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.24, 8, 6]} />
        <meshBasicMaterial color="#a8562f" transparent opacity={fireStoked ? 0.55 : 0.25} />
      </mesh>

      <group ref={flameRef} position={[0, 0.44, 0]} visible={false}>
        <mesh>
          <coneGeometry args={[0.4, 1.0, 6]} />
          <meshBasicMaterial color="#f2a03f" transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, -0.12, 0]}>
          <coneGeometry args={[0.22, 0.56, 6]} />
          <meshBasicMaterial color="#ffd77a" transparent opacity={0.95} />
        </mesh>
      </group>

      {fireStoked && quality !== 'low' ? (
        <pointLight position={[0, 1.1, 0]} color="#f2a03f" intensity={8} distance={15} decay={2} />
      ) : null}

      {/* Log seat and a water jar */}
      <mesh position={[-2.2, 0.28, 0.4]} rotation={[0, 0.25, 0]} castShadow material={trunk()}>
        <cylinderGeometry args={[0.26, 0.26, 2.2, 8]} />
      </mesh>
      <mesh
        position={[2.1, 0.36, -0.3]}
        castShadow
        material={matteMaterial('hearth-jar', '#8a5a33')}
      >
        <sphereGeometry args={[0.34, 10, 8]} />
      </mesh>
    </group>
  )
}

/** The Record Wall — low stone courses covered in carved names and tallies. */
export function RecordWall() {
  const slabs = [-2.7, -1.8, -0.9, 0, 0.9, 1.8, 2.7]

  return (
    <group>
      {slabs.map((x, index) => (
        <group key={`record-slab-${index}`} position={[x, 0, index % 2 === 0 ? 0.12 : -0.1]}>
          <mesh
            position={[0, 0.75, 0]}
            rotation={[0, index * 0.04 - 0.12, index % 2 === 0 ? 0.02 : -0.03]}
            castShadow
            receiveShadow
            material={matteMaterial(
              index % 2 === 0 ? 'record-stone-a' : 'record-stone-b',
              index % 2 === 0 ? '#9a978d' : '#858278',
            )}
          >
            <boxGeometry args={[1.05, 1.35 + (index % 3) * 0.18, 0.55]} />
          </mesh>

          {/* Carved lines. Short bars read as names at this scale. */}
          {[0, 1, 2, 3].map((line) => (
            <mesh
              key={`record-line-${index}-${line}`}
              position={[0, 0.5 + line * 0.24, 0.29]}
              material={matteMaterial('record-ink', '#4d4a43')}
            >
              <boxGeometry args={[0.58 - line * 0.07, 0.045, 0.02]} />
            </mesh>
          ))}
          {/* One deeper mark per slab, as if a name was cut twice */}
          <mesh
            position={[-0.28, 1.18, 0.29]}
            rotation={[0, 0, 0.12]}
            material={matteMaterial('record-ink', '#4d4a43')}
          >
            <boxGeometry args={[0.16, 0.09, 0.02]} />
          </mesh>
        </group>
      ))}

      {/* Ground course and moss */}
      <mesh
        position={[0, 0.12, 0]}
        receiveShadow
        material={matteMaterial('record-base', '#777469')}
      >
        <boxGeometry args={[6.7, 0.24, 0.95]} />
      </mesh>
      <mesh
        position={[-2.1, 1.43, 0.12]}
        castShadow
        material={matteMaterial('record-moss', '#74804d')}
      >
        <icosahedronGeometry args={[0.45, 0]} />
      </mesh>
      <mesh
        position={[2.3, 1.3, -0.16]}
        castShadow
        material={matteMaterial('record-moss', '#74804d')}
      >
        <icosahedronGeometry args={[0.32, 0]} />
      </mesh>
    </group>
  )
}

/** The Tide Bell — a bronze bell on a driftwood frame above the shore path. */
export function TideBell() {
  const bellRef = useRef<THREE.Group>(null)
  const quality = useSettingsStore((s) => s.quality)
  const bellRung = useWorldEffects((s) => s.bellRung)

  useFrame((state) => {
    if (!bellRef.current || quality === 'low') return
    const t = state.clock.elapsedTime
    const swing = bellRung ? Math.sin(t * 3.4) * 0.16 : Math.sin(t * 0.9) * 0.035
    bellRef.current.rotation.z = swing
  })

  return (
    <group>
      {/* Driftwood frame */}
      {[-1.25, 1.25].map((x, index) => (
        <mesh
          key={`bell-post-${index}`}
          position={[x, 1.55, 0]}
          rotation={[0, 0, index === 0 ? 0.04 : -0.04]}
          castShadow
          material={matteMaterial('bell-frame', '#6b5740')}
        >
          <cylinderGeometry args={[0.16, 0.21, 3.1, 7]} />
        </mesh>
      ))}
      <mesh position={[0, 3.02, 0]} rotation={[0, 0, Math.PI / 2]} castShadow material={trunk()}>
        <cylinderGeometry args={[0.15, 0.17, 3.0, 7]} />
      </mesh>

      {/* Bell and clapper */}
      <group ref={bellRef} position={[0, 2.85, 0]}>
        <mesh
          position={[0, -0.62, 0]}
          castShadow
          material={matteMaterial('bell-bronze', '#8a7442')}
        >
          <cylinderGeometry args={[0.5, 0.78, 1.15, 14]} />
        </mesh>
        <mesh position={[0, -1.2, 0]} castShadow material={matteMaterial('bell-rim', '#74613a')}>
          <cylinderGeometry args={[0.74, 0.8, 0.16, 14]} />
        </mesh>
        <mesh position={[0, 0.02, 0]} castShadow material={matteMaterial('bell-crown', '#74613a')}>
          <torusGeometry args={[0.24, 0.07, 6, 12]} />
        </mesh>
        <mesh position={[0, -0.9, 0]} material={matteMaterial('bell-clapper', '#3f3b34')}>
          <sphereGeometry args={[0.13, 8, 6]} />
        </mesh>
      </group>

      {/* Bell rope, tied off on the right post */}
      <mesh position={[0, 1.85, 0.04]} material={matteMaterial('bell-rope', '#cbbd9c')}>
        <cylinderGeometry args={[0.025, 0.025, 1.9, 5]} />
      </mesh>

      {/* Stone footing */}
      {[0, 1].map((index) => (
        <mesh
          key={`bell-foot-${index}`}
          position={[index === 0 ? -1.25 : 1.25, 0.12, 0]}
          receiveShadow
          material={stone()}
        >
          <cylinderGeometry args={[0.42, 0.48, 0.24, 8]} />
        </mesh>
      ))}
    </group>
  )
}

/** Gullrock Boathouse — tarred plank hut, door propped open, slipway full of weeds. */
export function Boathouse() {
  const planks = [0, 1, 2, 3]

  return (
    <group>
      {/* Stone footing */}
      <mesh position={[0, 0.14, 0]} receiveShadow material={stone()}>
        <boxGeometry args={[4.6, 0.28, 3.6]} />
      </mesh>
      {/* Walls */}
      <mesh
        position={[0, 1.4, 0]}
        castShadow
        receiveShadow
        material={matteMaterial('boathouse-wall', '#5f4a38')}
      >
        <boxGeometry args={[4.4, 2.8, 3.4]} />
      </mesh>
      {/* Vertical plank lines */}
      {planks.map((index) => (
        <mesh
          key={`boathouse-plank-${index}`}
          position={[-1.65 + index * 1.1, 1.4, 1.72]}
          castShadow
          material={matteMaterial('boathouse-seam', '#4a382b')}
        >
          <boxGeometry args={[0.09, 2.7, 0.06]} />
        </mesh>
      ))}
      {/* Shallow pitched roof, weathered */}
      <mesh
        position={[0, 3.05, 0]}
        castShadow
        material={matteMaterial('boathouse-roof', '#3f4a44')}
      >
        <boxGeometry args={[4.9, 0.24, 3.9]} />
      </mesh>
      <mesh
        position={[0, 3.42, 0]}
        rotation={[0, 0, 0]}
        castShadow
        material={matteMaterial('boathouse-roof', '#3f4a44')}
      >
        <boxGeometry args={[4.3, 0.2, 3.9]} />
      </mesh>
      {/* Open doorway with the door leaning outward */}
      <mesh position={[0.55, 1.15, 1.73]} material={matteMaterial('boathouse-dark', '#241a13')}>
        <boxGeometry args={[1.3, 2.3, 0.08]} />
      </mesh>
      <mesh
        position={[1.6, 1.1, 2.25]}
        rotation={[0, -0.7, 0]}
        castShadow
        material={matteMaterial('boathouse-door', '#7a5f45')}
      >
        <boxGeometry args={[1.25, 2.2, 0.1]} />
      </mesh>
      {/* Door frame, sign and lantern */}
      {[-0.15, 1.25].map((x) => (
        <mesh key={`boathouse-post-${x}`} position={[x, 1.2, 1.82]} castShadow material={trunk()}>
          <boxGeometry args={[0.14, 2.5, 0.16]} />
        </mesh>
      ))}
      <mesh position={[0.55, 2.45, 1.82]} castShadow material={trunk()}>
        <boxGeometry args={[1.7, 0.16, 0.18]} />
      </mesh>
      <mesh position={[0.55, 2.72, 1.8]} material={matteMaterial('boathouse-sign', '#d9b97f')}>
        <boxGeometry args={[1.35, 0.36, 0.07]} />
      </mesh>
      {[0, 1].map((index) => (
        <mesh key={`boathouse-sign-line-${index}`} position={[0.55, 2.79 - index * 0.14, 1.85]}>
          <boxGeometry args={[0.95 - index * 0.25, 0.045, 0.02]} />
          <meshBasicMaterial color="#5a3d27" />
        </mesh>
      ))}
      <HangingLantern position={[-0.4, 2.15, 1.92]} />
      {/* Small window with shutters */}
      <mesh position={[-1.45, 1.8, 1.72]} material={matteMaterial('window', '#bfe0e4')}>
        <boxGeometry args={[0.7, 0.65, 0.08]} />
      </mesh>
      <mesh position={[-1.45, 1.8, 1.77]} material={matteMaterial('boathouse-seam', '#4a382b')}>
        <boxGeometry args={[0.08, 0.68, 0.05]} />
      </mesh>
      <WindowGlow position={[-1.45, 1.8, 1.81]} size={[0.62, 0.57]} />
      {/* Coiled rope, barrels and leaning oars */}
      <mesh
        position={[1.85, 1.35, 1.82]}
        rotation={[0, Math.PI / 2, 0]}
        material={matteMaterial('rope', '#c2a874')}
      >
        <torusGeometry args={[0.32, 0.06, 6, 14]} />
      </mesh>
      <mesh position={[-1.75, 0.78, 2.2]} castShadow material={matteMaterial('barrel', '#7a4b32')}>
        <cylinderGeometry args={[0.34, 0.32, 0.7, 10]} />
      </mesh>
      {[0, 1].map((index) => (
        <group
          key={`boathouse-oar-${index}`}
          position={[-1.95 + index * 0.18, 1.05, 2.65]}
          rotation={[0.2, 0, -0.34]}
        >
          <mesh castShadow material={trunk()}>
            <cylinderGeometry args={[0.045, 0.055, 2.1, 6]} />
          </mesh>
          <mesh position={[0, -0.9, 0]} material={wood()}>
            <boxGeometry args={[0.05, 0.5, 0.28]} />
          </mesh>
        </group>
      ))}
      {/* Slipway running down to the water */}
      <mesh
        position={[-0.4, 0.12, 3.6]}
        rotation={[0.12, 0, 0]}
        receiveShadow
        material={matteMaterial('boathouse-slip', '#6e6152')}
      >
        <boxGeometry args={[3, 0.2, 4.2]} />
      </mesh>
      {/* Weeds across the slipway */}
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <mesh
          key={`weed-${index}`}
          position={[-1.4 + index * 0.45, 0.26, 2.2 + (index % 3) * 1.1]}
          castShadow
          material={matteMaterial('boathouse-weed', '#5d7f45')}
        >
          <coneGeometry args={[0.07, 0.9, 4]} />
        </mesh>
      ))}
      {/* Weathervane, long since still */}
      <mesh
        position={[0, 4.1, -0.6]}
        castShadow
        material={matteMaterial('boathouse-metal', '#6d6a60')}
      >
        <boxGeometry args={[0.08, 1.2, 0.9]} />
      </mesh>
    </group>
  )
}

/**
 * Collectible keepsakes.
 *
 * Small, findable objects that sit slightly off the path. They share one
 * family — shell, shard, totem — so each island can host a set of three
 * without needing its own models.
 */

/** A worn spiral shell with a warm tip. */
export function RelicShell() {
  return (
    <group rotation={[0, 0.45, 0]}>
      <mesh
        position={[0, 0.26, 0]}
        scale={[1, 0.6, 0.82]}
        castShadow
        material={matteMaterial('shell-base', '#efe3cf')}
      >
        <sphereGeometry args={[0.52, 12, 10]} />
      </mesh>
      <mesh
        position={[0.36, 0.44, 0]}
        rotation={[0, 0, -0.72]}
        castShadow
        material={matteMaterial('shell-tip', '#cfa268')}
      >
        <coneGeometry args={[0.19, 0.5, 8]} />
      </mesh>
      <mesh
        position={[-0.08, 0.2, 0.3]}
        rotation={[0.35, 0, 0]}
        material={matteMaterial('shell-lip', '#dcc9a5')}
      >
        <torusGeometry args={[0.3, 0.045, 6, 14, Math.PI]} />
      </mesh>
    </group>
  )
}

/** A faintly glowing crystal cluster. */
export function RelicShard() {
  const glowRef = useRef<THREE.Mesh>(null)
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)

  useFrame((state) => {
    if (reducedMotion || !glowRef.current) return
    const material = glowRef.current.material as THREE.MeshBasicMaterial
    material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 2.1) * 0.14
  })

  return (
    <group>
      <mesh
        position={[0, 0.42, 0]}
        rotation={[0.1, 0.5, -0.08]}
        castShadow
        material={matteMaterial('shard-main', '#8fb8a8')}
      >
        <coneGeometry args={[0.25, 0.9, 5]} />
      </mesh>
      <mesh
        position={[0.22, 0.24, 0.12]}
        rotation={[0.28, 0, 0.52]}
        castShadow
        material={matteMaterial('shard-side', '#a7c9bb')}
      >
        <coneGeometry args={[0.13, 0.48, 5]} />
      </mesh>
      <mesh ref={glowRef} position={[0, 0.42, 0]}>
        <sphereGeometry args={[0.52, 8, 6]} />
        <meshBasicMaterial
          color="#bff0dd"
          transparent
          opacity={0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

/** A small stacked-stone totem with a carved mark. */
export function RelicTotem() {
  return (
    <group rotation={[0, 0.3, 0]}>
      <mesh position={[0, 0.18, 0]} castShadow material={matteMaterial('totem-base', '#b9b3a4')}>
        <cylinderGeometry args={[0.34, 0.42, 0.36, 7]} />
      </mesh>
      <mesh
        position={[0, 0.52, 0]}
        rotation={[0, 0.5, 0]}
        castShadow
        material={matteMaterial('totem-mid', '#a8a294')}
      >
        <cylinderGeometry args={[0.26, 0.3, 0.34, 7]} />
      </mesh>
      <mesh position={[0, 0.84, 0]} castShadow material={matteMaterial('totem-cap', '#8c8b85')}>
        <coneGeometry args={[0.23, 0.32, 7]} />
      </mesh>
      {/* The carved mark, facing the path */}
      <mesh
        position={[0, 0.52, 0.27]}
        rotation={[0, 0.5, 0]}
        material={matteMaterial('totem-mark', '#5f6b5a')}
      >
        <boxGeometry args={[0.1, 0.2, 0.02]} />
      </mesh>
    </group>
  )
}
