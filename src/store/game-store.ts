import { create } from 'zustand'
import type { DiscoveryEntry, GameState, IslandDefinition } from '@/types'
import { STORAGE_KEYS, readJson, removeKey, writeJson } from '@/lib/storage'
import { getObjectById, islandDiscoverableCount } from '@/data/objects'
import { DEFAULT_ISLAND_ID, getIsland, islandOfObjectId, isKnownIsland } from '@/data/islands'
import { normaliseProgress, type StoredProgress } from '@/store/progress-schema'
import { addDiscovery, discoveredIds, summariseProgress } from '@/game/discovery/discovery'
import { resolveInteraction } from '@/game/interaction/interaction'
import { legacyProgress } from '@/game/quest/legacy'
import { LEGACY_QUEST } from '@/data/quests'
import { STORY_FRAGMENTS } from '@/data/story'
import { storyState } from '@/game/story/story'
import { useWorldEffects } from '@/world/objects/world-effects'
import { useUiStore } from '@/store/ui-store'

/** One-shot notification raised by an interaction, consumed by the toast host. */
export interface ToastPayload {
  id: string
  title: string
  description: string
  variant: 'success' | 'info' | 'error'
}

interface GameStore extends Omit<GameState, 'discoveries'> {
  toasts: ToastPayload[]
  /** Discoveries for every island, keyed by island id. */
  discoveriesByIsland: Record<string, DiscoveryEntry[]>

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

  /** Travel to another island, clearing the selection and the world effects. */
  setActiveIsland: (islandId: string) => void

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

/** Sessions for every island, so switching back does not lose the position. */
interface StoredSessions {
  version: 2
  islands: Record<string, StoredSession>
}

const EMPTY_SESSIONS: StoredSessions = { version: 2, islands: {} }

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** Read one island's saved position, rejecting anything malformed. */
function readSessionEntry(raw: unknown): StoredSession | null {
  if (typeof raw !== 'object' || raw === null) return null

  const record = raw as Record<string, unknown>
  const position = record['position']
  if (typeof position !== 'object' || position === null) return null

  const pos = position as Record<string, unknown>
  if (!isFiniteNumber(pos['x']) || !isFiniteNumber(pos['z'])) return null
  if (!isFiniteNumber(record['yaw'])) return null

  return { position: { x: pos['x'], z: pos['z'] }, yaw: record['yaw'] }
}

function loadSessions(): StoredSessions {
  const raw = readJson<unknown>(SESSION_KEY, null)
  if (typeof raw !== 'object' || raw === null) return EMPTY_SESSIONS

  const record = raw as Record<string, unknown>

  // Version 1 stored a single session for the only island that existed.
  if (record['version'] !== 2) {
    const legacy = readSessionEntry(record)
    return legacy ? { version: 2, islands: { [DEFAULT_ISLAND_ID]: legacy } } : EMPTY_SESSIONS
  }

  const islands = record['islands']
  if (typeof islands !== 'object' || islands === null) return EMPTY_SESSIONS

  const parsed: Record<string, StoredSession> = {}
  for (const [islandId, entry] of Object.entries(islands as Record<string, unknown>)) {
    if (!isKnownIsland(islandId)) continue
    const session = readSessionEntry(entry)
    if (session) parsed[islandId] = session
  }

  return { version: 2, islands: parsed }
}

export const useGameStore = create<GameStore>()((set, get) => {
  const persistProgress = (islands: Record<string, DiscoveryEntry[]>): boolean =>
    writeJson(STORAGE_KEYS.progress, {
      version: 2,
      islands,
    } satisfies StoredProgress)

  return {
    selectedId: null,
    nearbyId: null,
    panelOpen: false,
    modalOpen: false,
    exploring: false,
    photoMode: false,
    onboardingComplete: false,
    uiFirstMode: false,
    activeIslandId: DEFAULT_ISLAND_ID,
    discoveriesByIsland: {},
    lastDiscoveredId: null,
    toasts: [],

    select: (id) => set({ selectedId: id }),

    setNearby: (id) => {
      if (get().nearbyId === id) return
      set({ nearbyId: id })
    },

    openPanel: (id) => {
      if (!getObjectById(getIsland(get().activeIslandId), id)) return
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

    setActiveIsland: (islandId) => {
      if (!isKnownIsland(islandId)) return
      if (islandId === get().activeIslandId) return

      // A landmark from the island being left must never stay selected, and the
      // transient effects do not carry across.
      useWorldEffects.getState().reset()
      set({
        activeIslandId: islandId,
        selectedId: null,
        nearbyId: null,
        panelOpen: false,
        lastDiscoveredId: null,
      })
    },

    interact: (id) => {
      const island = getIsland(get().activeIslandId)
      const outcome = resolveInteraction(island, id)
      if (!outcome) return

      if (outcome.effect) {
        useWorldEffects.getState().apply(outcome.effect)
      }

      const discoveriesBefore = get().discoveriesByIsland
      const legacyBefore = legacyProgress(discoveriesBefore)
      let isNew = false
      let discoveriesAfter = get().discoveriesByIsland

      if (outcome.discovers) {
        const current = discoveriesAfter[island.id] ?? []
        const result = addDiscovery(current, id)
        isNew = result.isNew
        if (isNew) {
          discoveriesAfter = {
            ...discoveriesAfter,
            [island.id]: result.discoveries,
          }
          set({ discoveriesByIsland: discoveriesAfter, lastDiscoveredId: id })
          persistProgress(discoveriesAfter)
        }
      }

      if (isNew) {
        const object = getObjectById(island, id)
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

      // Legacy progress is derived from discoveries, but the player still needs
      // to be told when a step is actually reached.
      const legacyAfter = legacyProgress(discoveriesAfter)
      if (legacyAfter.stepIndex > legacyBefore.stepIndex) {
        // A gap can close several already-discovered steps at once. Announce the
        // step the player just completed, not the last one in the chain.
        const step = LEGACY_QUEST.steps[legacyBefore.stepIndex]
        if (legacyAfter.complete) {
          get().pushToast({
            title: 'Legacy complete',
            description:
              LEGACY_QUEST.steps.at(-1)?.completion ?? 'The first settlers’ trail is finished.',
            variant: 'success',
          })
        } else if (step) {
          get().pushToast({
            title: `Legacy — ${step.title}`,
            description: step.completion,
            variant: 'success',
          })
        }
      }

      // The story journal unlocks alongside the trail. Completion gets the
      // full-screen epilogue instead of a toast about an entry.
      const storyBefore = storyState(discoveriesBefore)
      const storyAfter = storyState(discoveriesAfter)
      if (legacyAfter.complete && !legacyBefore.complete) {
        useUiStore.getState().openOverlay('epilogue')
      } else {
        for (const fragment of STORY_FRAGMENTS) {
          if (!storyAfter.unlockedIds.has(fragment.id)) continue
          if (storyBefore.unlockedIds.has(fragment.id)) continue
          get().pushToast({
            title: `Journal — ${fragment.title}`,
            description: 'A new entry was added to The Story of the Nine.',
            variant: 'info',
          })
        }
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
      const islandId = get().activeIslandId
      const discoveriesByIsland = { ...get().discoveriesByIsland, [islandId]: [] }

      set({ discoveriesByIsland, lastDiscoveredId: null })
      useWorldEffects.getState().reset()
      persistProgress(discoveriesByIsland)
    },

    hydrate: () => {
      const stored = normaliseProgress(
        readJson<unknown>(STORAGE_KEYS.progress, null),
        islandOfObjectId,
      )
      set({ discoveriesByIsland: stored.islands })
    },
  }
})

/** The islands the explorer has visited, in switcher order, with progress. */
export interface IslandProgress {
  islandId: string
  discovered: number
  total: number
}

const EMPTY_ENTRIES: DiscoveryEntry[] = []

/** The island the explorer is standing on. */
export function useActiveIsland(): IslandDefinition {
  return useGameStore((state) => getIsland(state.activeIslandId))
}

/** The discoveries recorded on the island the explorer is standing on. */
export function useActiveDiscoveries(): DiscoveryEntry[] {
  return useGameStore((state) => state.discoveriesByIsland[state.activeIslandId] ?? EMPTY_ENTRIES)
}

/** Progress for the active island, as `n of m`. */
export const selectProgress = (state: GameStore) => {
  const island = getIsland(state.activeIslandId)
  const entries = state.discoveriesByIsland[island.id] ?? EMPTY_ENTRIES
  return summariseProgress(entries, islandDiscoverableCount(island))
}

export const selectDiscoveredSet = (state: GameStore): Set<string> =>
  discoveredIds(state.discoveriesByIsland[state.activeIslandId] ?? EMPTY_ENTRIES)

/** Load the resume session for one island, outside the store so the rig can use it. */
export function readResumeSession(islandId: string): StoredSession | null {
  return loadSessions().islands[islandId] ?? null
}

export function writeResumeSession(islandId: string, session: StoredSession): boolean {
  const sessions = loadSessions()
  sessions.islands[islandId] = session
  return writeJson(SESSION_KEY, sessions)
}

export function clearResumeSession(): void {
  removeKey(SESSION_KEY)
}
