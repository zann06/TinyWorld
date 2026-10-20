import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSettingsStore } from '@/store/settings-store'
import { LIGHTING_PRESETS, TIME_PRESET_ORDER } from './lighting-presets'

const scratchFrom = new THREE.Color()
const scratchTo = new THREE.Color()

/** Mix two hex colours into an existing THREE.Color without allocating. */
function mixInto(target: THREE.Color, from: string, to: string, t: number): void {
  scratchFrom.set(from)
  scratchTo.set(to)
  target.copy(scratchFrom).lerp(scratchTo, t)
}

/**
 * Time-of-day lighting.
 *
 * Transitions are eased inside the frame loop rather than through React state,
 * so changing the time of day never triggers a render storm. The last applied
 * progress is remembered, which keeps a static scene allocation-free: the
 * lighting is only recomputed while the preset is actually changing.
 */
export function TimeBasedLighting({ shadows }: { shadows: boolean }) {
  const timeOfDay = useSettingsStore((s) => s.timeOfDay)
  const autoCycle = useSettingsStore((s) => s.autoCycleTime)
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)
  const quality = useSettingsStore((s) => s.quality)

  const sunRef = useRef<THREE.DirectionalLight>(null)
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)

  // Progress 0..2 across day -> dusk -> night.
  const progress = useRef(TIME_PRESET_ORDER.indexOf(timeOfDay))
  const lastApplied = useRef(-1)

  useEffect(() => {
    progress.current = TIME_PRESET_ORDER.indexOf(timeOfDay)
    lastApplied.current = -1
  }, [timeOfDay])

  useFrame((state, delta) => {
    if (autoCycle && !reducedMotion) {
      progress.current = (progress.current + delta * 0.045) % TIME_PRESET_ORDER.length
    }

    const wrapped = ((progress.current % 3) + 3) % 3
    if (Math.abs(wrapped - lastApplied.current) < 0.0001) return
    lastApplied.current = wrapped

    const fromIndex = Math.floor(wrapped)
    const toIndex = (fromIndex + 1) % 3
    const t = wrapped - fromIndex

    const from = LIGHTING_PRESETS[TIME_PRESET_ORDER[fromIndex] ?? 'day']
    const to = LIGHTING_PRESETS[TIME_PRESET_ORDER[toIndex] ?? 'dusk']

    const sun = sunRef.current
    if (sun) {
      sun.position.set(
        THREE.MathUtils.lerp(from.sunPosition[0], to.sunPosition[0], t),
        THREE.MathUtils.lerp(from.sunPosition[1], to.sunPosition[1], t),
        THREE.MathUtils.lerp(from.sunPosition[2], to.sunPosition[2], t),
      )
      mixInto(sun.color, from.sunColor, to.sunColor, t)
      sun.intensity = THREE.MathUtils.lerp(from.sunIntensity, to.sunIntensity, t)
    }

    const ambient = ambientRef.current
    if (ambient) {
      mixInto(ambient.color, from.ambientColor, to.ambientColor, t)
      ambient.intensity = THREE.MathUtils.lerp(from.ambientIntensity, to.ambientIntensity, t)
    }

    const hemi = hemiRef.current
    if (hemi) {
      mixInto(hemi.color, from.hemiSky, to.hemiSky, t)
      mixInto(hemi.groundColor, from.hemiGround, to.hemiGround, t)
    }

    const scene = state.scene
    if (scene.background instanceof THREE.Color) {
      mixInto(scene.background, from.fogColor, to.fogColor, t)
    }
    if (scene.fog instanceof THREE.Fog) {
      mixInto(scene.fog.color, from.fogColor, to.fogColor, t)
    }
  })

  return (
    <>
      <ambientLight ref={ambientRef} intensity={1.3} />
      <hemisphereLight ref={hemiRef} intensity={0.9} />
      <directionalLight
        ref={sunRef}
        castShadow={shadows}
        position={[48, 60, 32]}
        shadow-mapSize-width={quality === 'high' ? 2048 : 1024}
        shadow-mapSize-height={quality === 'high' ? 2048 : 1024}
        shadow-camera-near={1}
        shadow-camera-far={240}
        shadow-camera-left={-72}
        shadow-camera-right={72}
        shadow-camera-top={72}
        shadow-camera-bottom={-72}
        shadow-bias={-0.0008}
        shadow-normalBias={0.03}
      />
    </>
  )
}
