import type { QualityLevel, SettingsState, TimeOfDayPreset } from '@/types'

export const DEFAULT_SETTINGS: SettingsState = {
  quality: 'high',
  cameraSensitivity: 1,
  masterVolume: 0.6,
  muted: false,
  reducedMotion: false,
  showHud: true,
  invertLookY: false,
  timeOfDay: 'day',
  autoCycleTime: false,
}

export const QUALITY_LEVELS: readonly QualityLevel[] = ['low', 'medium', 'high'] as const
export const TIME_PRESETS: readonly TimeOfDayPreset[] = ['day', 'dusk', 'night'] as const

export const MIN_SENSITIVITY = 0.2
export const MAX_SENSITIVITY = 3

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

/**
 * Coerce arbitrary parsed JSON into a valid SettingsState.
 * Every field is validated independently so one bad key cannot poison the rest.
 */
export function normaliseSettings(input: unknown): SettingsState {
  if (!isRecord(input)) return { ...DEFAULT_SETTINGS }

  const quality = input['quality']
  const timeOfDay = input['timeOfDay']
  const sensitivity = input['cameraSensitivity']
  const volume = input['masterVolume']

  return {
    quality: QUALITY_LEVELS.includes(quality as QualityLevel)
      ? (quality as QualityLevel)
      : DEFAULT_SETTINGS.quality,
    cameraSensitivity: clamp(
      typeof sensitivity === 'number' ? sensitivity : DEFAULT_SETTINGS.cameraSensitivity,
      MIN_SENSITIVITY,
      MAX_SENSITIVITY,
    ),
    masterVolume: clamp(typeof volume === 'number' ? volume : DEFAULT_SETTINGS.masterVolume, 0, 1),
    muted: typeof input['muted'] === 'boolean' ? input['muted'] : DEFAULT_SETTINGS.muted,
    reducedMotion:
      typeof input['reducedMotion'] === 'boolean'
        ? input['reducedMotion']
        : DEFAULT_SETTINGS.reducedMotion,
    showHud: typeof input['showHud'] === 'boolean' ? input['showHud'] : DEFAULT_SETTINGS.showHud,
    invertLookY:
      typeof input['invertLookY'] === 'boolean'
        ? input['invertLookY']
        : DEFAULT_SETTINGS.invertLookY,
    timeOfDay: TIME_PRESETS.includes(timeOfDay as TimeOfDayPreset)
      ? (timeOfDay as TimeOfDayPreset)
      : DEFAULT_SETTINGS.timeOfDay,
    autoCycleTime:
      typeof input['autoCycleTime'] === 'boolean'
        ? input['autoCycleTime']
        : DEFAULT_SETTINGS.autoCycleTime,
  }
}
