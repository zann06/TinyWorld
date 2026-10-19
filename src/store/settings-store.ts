import { create } from 'zustand'
import type { QualityLevel, SettingsState, TimeOfDayPreset } from '@/types'
import { STORAGE_KEYS, readJson, writeJson } from '@/lib/storage'
import {
  DEFAULT_SETTINGS,
  MAX_SENSITIVITY,
  MIN_SENSITIVITY,
  normaliseSettings,
} from '@/store/settings-defaults'

interface SettingsActions {
  /** False when settings could not be written (private mode, quota, disabled). */
  persistent: boolean
  setQuality: (quality: QualityLevel) => void
  setCameraSensitivity: (value: number) => void
  setMasterVolume: (value: number) => void
  setMuted: (muted: boolean) => void
  toggleMuted: () => void
  setReducedMotion: (value: boolean) => void
  setShowHud: (value: boolean) => void
  setInvertLookY: (value: boolean) => void
  setTimeOfDay: (preset: TimeOfDayPreset) => void
  setAutoCycleTime: (value: boolean) => void
  resetSettings: () => void
  hydrate: () => void
}

export type SettingsStore = SettingsState & SettingsActions

/** Extract only the persisted slice — never leak actions into storage. */
function toPersistable(state: SettingsStore): SettingsState {
  return {
    quality: state.quality,
    cameraSensitivity: state.cameraSensitivity,
    masterVolume: state.masterVolume,
    muted: state.muted,
    reducedMotion: state.reducedMotion,
    showHud: state.showHud,
    invertLookY: state.invertLookY,
    timeOfDay: state.timeOfDay,
    autoCycleTime: state.autoCycleTime,
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export const useSettingsStore = create<SettingsStore>()((set, get) => {
  /** Apply a patch, persist the result, and report whether persistence worked. */
  const commit = (patch: Partial<SettingsState>): void => {
    set(patch)
    const ok = writeJson(STORAGE_KEYS.settings, toPersistable(get()))
    set({ persistent: ok })
  }

  return {
    ...DEFAULT_SETTINGS,
    persistent: true,

    setQuality: (quality) => commit({ quality }),
    setCameraSensitivity: (value) =>
      commit({ cameraSensitivity: clamp(value, MIN_SENSITIVITY, MAX_SENSITIVITY) }),
    setMasterVolume: (value) => commit({ masterVolume: clamp(value, 0, 1) }),
    setMuted: (muted) => commit({ muted }),
    toggleMuted: () => commit({ muted: !get().muted }),
    setReducedMotion: (value) => commit({ reducedMotion: value }),
    setShowHud: (value) => commit({ showHud: value }),
    setInvertLookY: (value) => commit({ invertLookY: value }),
    setTimeOfDay: (preset) => commit({ timeOfDay: preset }),
    setAutoCycleTime: (value) => commit({ autoCycleTime: value }),

    resetSettings: () => {
      const ok = writeJson(STORAGE_KEYS.settings, { ...DEFAULT_SETTINGS })
      set({ ...DEFAULT_SETTINGS, persistent: ok })
    },

    hydrate: () => {
      const raw = readJson<unknown>(STORAGE_KEYS.settings, null)
      const hasStoredSettings = raw !== null
      const stored = normaliseSettings(raw)

      // With no saved preference, fall back to the operating system's motion
      // setting. Once the user chooses explicitly, their choice always wins.
      const reducedMotion = hasStoredSettings
        ? stored.reducedMotion
        : stored.reducedMotion || systemPrefersReducedMotion()

      set({ ...stored, reducedMotion, persistent: true })
    },
  }
})

/** True when the OS asks for reduced motion. */
export function systemPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}
