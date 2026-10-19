import type { TimeOfDayPreset } from '@/types'

export interface TimeLighting {
  sunColor: string
  sunIntensity: number
  ambientColor: string
  ambientIntensity: number
  hemiSky: string
  hemiGround: string
  skyTop: string
  skyBottom: string
  sunPosition: [number, number, number]
  fogColor: string
}

/** Colour ramps for each time of day. Linear interpolation happens at runtime. */
export const LIGHTING_PRESETS: Record<TimeOfDayPreset, TimeLighting> = {
  day: {
    sunColor: '#fff6e0',
    sunIntensity: 2.6,
    ambientColor: '#e8f1ff',
    ambientIntensity: 1.35,
    hemiSky: '#cfe8f8',
    hemiGround: '#8fbc72',
    skyTop: '#6fbdee',
    skyBottom: '#e8f6fb',
    sunPosition: [52, 68, 38],
    fogColor: '#cfe6ef',
  },
  dusk: {
    sunColor: '#ffbe78',
    sunIntensity: 1.9,
    ambientColor: '#b7a6e0',
    ambientIntensity: 1.15,
    hemiSky: '#d3a7dd',
    hemiGround: '#7a5f48',
    skyTop: '#5a4b8f',
    skyBottom: '#f5a970',
    sunPosition: [-52, 26, 24],
    fogColor: '#e0a983',
  },
  night: {
    sunColor: '#9fb6e8',
    sunIntensity: 0.75,
    ambientColor: '#4a5c92',
    ambientIntensity: 0.95,
    hemiSky: '#3d4d80',
    hemiGround: '#24333f',
    skyTop: '#0f1836',
    skyBottom: '#33456c',
    sunPosition: [-30, 52, -36],
    fogColor: '#1d2848',
  },
}

/** Cyclic order used by the automatic day/night cycle. */
export const TIME_PRESET_ORDER: readonly TimeOfDayPreset[] = ['day', 'dusk', 'night'] as const
