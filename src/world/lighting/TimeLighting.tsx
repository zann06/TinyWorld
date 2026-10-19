import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSettingsStore } from '@/store/settings-store'
import { LIGHTING_PRESETS, TIME_PRESET_ORDER, type TimeLighting } from './lighting-presets'

const COLOUR_KEYS = [
  'sunColor',
  'ambientColor',
  'hemiSky',
  'hemiGround',
  'skyTop',
  'skyBottom',
  'fogColor',
] as const satisfies readonly (keyof TimeLighting)[]

type ColourKey = (typeof COLOUR_KEYS)[number]
type LightingOverrides = Partial<Record<ColourKey, string>> & {
  sunIntensity: number
  ambientIntensity: number
  sunPosition: [number, number, number]
}

function lerpLighting(from: TimeLighting, to: TimeLighting, t: number): TimeLighting {
  const out: LightingOverrides = {
    sunIntensity: THREE.MathUtils.lerp(from.sunIntensity, to.sunIntensity, t),
    ambientIntensity: THREE.MathUtils.lerp(from.ambientIntensity, to.ambientIntensity, t),
    sunPosition: [
      THREE.MathUtils.lerp(from.sunPosition[0], to.sunPosition[0], t),
      THREE.MathUtils.lerp(from.sunPosition[1], to.sunPosition[1], t),
      THREE.MathUtils.lerp(from.sunPosition[2], to.sunPosition[2], t),
    ],
  }

  for (const key of COLOUR_KEYS) {
    const a = new THREE.Color(from[key])
    const b = new THREE.Color(to[key])
    out[key] = `#${a.lerp(b, t).getHexString()}`
  }

  return out as TimeLighting
}

/**
 * Time-of-day lighting.
 *
 * Transitions are eased inside the frame loop rather than through React state,
 * so changing the time of day never triggers a render storm.
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

  useEffect(() => {
    progress.current = TIME_PRESET_ORDER.indexOf(timeOfDay)
  }, [timeOfDay])

  useFrame((state, delta) => {
    if (autoCycle && !reducedMotion) {
      progress.current = (progress.current + delta * 0.045) % TIME_PRESET_ORDER.length
    }

    const wrapped = ((progress.current % 3) + 3) % 3
    const fromIndex = Math.floor(wrapped)
    const toIndex = (fromIndex + 1) % 3
    const t = wrapped - fromIndex

    const from = LIGHTING_PRESETS[TIME_PRESET_ORDER[fromIndex] ?? 'day']
    const to = LIGHTING_PRESETS[TIME_PRESET_ORDER[toIndex] ?? 'dusk']
    const lighting = lerpLighting(from, to, t)

    const sun = sunRef.current
    if (sun) {
      sun.position.set(...lighting.sunPosition)
      sun.color.set(lighting.sunColor)
      sun.intensity = lighting.sunIntensity
    }

    const ambient = ambientRef.current
    if (ambient) {
      ambient.color.set(lighting.ambientColor)
      ambient.intensity = lighting.ambientIntensity
    }

    const hemi = hemiRef.current
    if (hemi) {
      hemi.color.set(lighting.hemiSky)
      hemi.groundColor.set(lighting.hemiGround)
    }

    const scene = state.scene
    if (scene.background instanceof THREE.Color) {
      scene.background.set(lighting.fogColor)
    }
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.set(lighting.fogColor)
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
