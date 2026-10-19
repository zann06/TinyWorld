import { create } from 'zustand'
import type { DiscoveryEntry, GameState } from '@/types'
import { STORAGE_KEYS, readJson, removeKey, writeJson } from '@/lib/storage'
import { KNOWN_OBJECT_IDS, TOTAL_DISCOVERABLE, getObjectById } from '@/data/objects'
import { normaliseProgress } from '@/store/progress-schema'
import { addDiscovery, discoveredIds, summariseProgress } from '@/game/discovery/discovery'
import { resolveInteraction } from '@/game/interaction/interaction'
import { useWorldEffects } from '@/world/objects/world-effects'

/** One-shot notification raised by an interaction, consumed by the toast host. */
export interface ToastPayload {
  id: string
  title: string
  description: string
  variant: 'success' | 'info' | 'error'
}

interface GameStore extends GameState {
  toasts: ToastPayload[]

  select: (id: string | null) => void
  setNearby: (id: string | null) => void
  openPanel: (id: string) => void
  closePanel: () => void
  setModalOpen: (open: boolean) => void
  setExploring: (exploring: boolean) => void
  setPhotoMode: (photoMode: boolean) => void
  setUiFirstMode: (value: boolean) => void
  completeOnboarding: () => void
  dismissOnboarding: () => void

  /** Runs an object's real action and records discovery when appropriate. */
  interact: (id: string) => void

  pushToast: (toast: Omit<ToastPayload, 'id'>) => void
  dismissToast: (id: string) => void

  resetProgress: () => void
  hydrate: () => void
}

let toastCounter = 0

const SESSION_KEY = STORAGE_KEYS.session

/** Persisted across refresh so a returning visitor resumes where they stood. */
export interface StoredSession {
  position: { x: number; z: number }
  yaw: number
}

function loadSession(): StoredSession | null {
  const raw = readJson<unknown>(SESSION_KEY, null)
  if (typeof raw !== 'object' || raw === null) return null

  const record = raw as Record<string, unknown>
  const position = record['position']
  const yaw = record['yaw']

  if (typeof position !== 'object' || position === null) return null
  const pos = position as Record<string, unknown>
  if (typeof pos['x'] !== 'number' || typeof pos['z'] !== 'number') return null
  if (!Number.isFinite(pos['x']) || !Number.isFinite(pos['z'])) return null
  if (typeof yaw !== 'number' || !Number.isFinite(yaw)) return null

  return { position: { x: pos['x'], z: pos['z'] }, yaw }
}

export const useGameStore = create<GameStore>()((set, get) => {
  const persistProgress = (discoveries: DiscoveryEntry[]): boolean =>
    writeJson(STORAGE_KEYS.progress, { version: 1, discoveries })

  return {
    selectedId: null,
    nearbyId: null,
    panelOpen: false,
    modalOpen: false,
    exploring: false,
    photoMode: false,
    onboardingComplete: false,
    uiFirstMode: false,
    discoveries: [],
    lastDiscoveredId: null,
    toasts: [],

    select: (id) => set({ selectedId: id }),

    setNearby: (id) => {
      if (get().nearbyId === id) return
      set({ nearbyId: id })
    },

    openPanel: (id) => {
      if (!getObjectById(id)) return
      set({ selectedId: id, panelOpen: true })
      get().interact(id)
    },

    closePanel: () => set({ panelOpen: false }),

    setModalOpen: (open) => set({ modalOpen: open }),

    setExploring: (exploring) => set({ exploring }),

    setPhotoMode: (photoMode) => set({ photoMode }),

    setUiFirstMode: (value) => set({ uiFirstMode: value }),

    completeOnboarding: () => set({ onboardingComplete: true }),

    dismissOnboarding: () => set({ onboardingComplete: true }),

    interact: (id) => {
      const outcome = resolveInteraction(id)
      if (!outcome) return

      if (outcome.effect) {
        useWorldEffects.getState().apply(outcome.effect)
      }

      let isNew = false
      if (outcome.discovers) {
        const result = addDiscovery(get().discoveries, id)
        isNew = result.isNew
        if (isNew) {
          set({
            discoveries: result.discoveries,
            lastDiscoveredId: id,
          })
          persistProgress(result.discoveries)
        }
      }

      if (isNew) {
        const object = getObjectById(id)
        get().pushToast({
          title: `Discovered — ${object?.name ?? id}`,
          description: outcome.message.slice(0, 140),
          variant: 'success',
        })
      } else {
        get().pushToast({
          title: outcome.title,
          description: outcome.message.slice(0, 140),
          variant: 'info',
        })
      }
    },

    pushToast: (toast) => {
      const id = `toast-${++toastCounter}`
      // Cap the stack so a burst of interactions cannot fill the screen.
      set((state) => ({ toasts: [...state.toasts, { ...toast, id }].slice(-3) }))
    },

    dismissToast: (id) => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
    },

    resetProgress: () => {
      set({ discoveries: [], lastDiscoveredId: null })
      persistProgress([])
    },

    hydrate: () => {
      const stored = normaliseProgress(
        readJson<unknown>(STORAGE_KEYS.progress, null),
        KNOWN_OBJECT_IDS,
      )
      set({ discoveries: stored.discoveries })
    },
  }
})

/** Load the resume session outside the store so it can be used by the camera rig. */
export function readResumeSession(): StoredSession | null {
  return loadSession()
}

export function writeResumeSession(session: StoredSession): boolean {
  return writeJson(SESSION_KEY, session)
}

export function clearResumeSession(): void {
  removeKey(SESSION_KEY)
}

/** Derived selectors. */
export const selectProgress = (state: GameStore) =>
  summariseProgress(state.discoveries, TOTAL_DISCOVERABLE)

export const selectDiscoveredSet = (state: GameStore): Set<string> =>
  discoveredIds(state.discoveries)
