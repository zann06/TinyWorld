import { create } from 'zustand'
import type { InteractionOutcome } from '@/game/interaction/interaction'

/**
 * Transient world state driven by interactions — a lit lantern, a stoked fire.
 * Kept out of React state that would re-render the whole HUD.
 */
interface WorldEffectsStore {
  lanternLit: boolean
  fireStoked: boolean
  springTouched: boolean
  sailsTurned: number
  /** Applies an interaction effect. Returns true when something changed. */
  apply: (effect: NonNullable<InteractionOutcome['effect']>) => boolean
}

export const useWorldEffects = create<WorldEffectsStore>()((set, get) => ({
  lanternLit: false,
  fireStoked: false,
  springTouched: false,
  sailsTurned: 0,

  apply: (effect) => {
    switch (effect) {
      case 'light-lantern': {
        if (get().lanternLit) return false
        set({ lanternLit: true })
        return true
      }
      case 'stoke-fire': {
        if (get().fireStoked) return false
        set({ fireStoked: true })
        return true
      }
      case 'splash-spring': {
        if (get().springTouched) return false
        set({ springTouched: true })
        return true
      }
      case 'turn-sails': {
        set((state) => ({ sailsTurned: state.sailsTurned + 1 }))
        return true
      }
      default:
        return false
    }
  },
}))
