import { create } from 'zustand'

/**
 * Transient UI shell state: which blocking surface owns the screen.
 *
 * Kept separate from the game store so that opening the journal does not
 * invalidate selectors used by the 3D scene.
 */
export type OverlayId = 'settings' | 'journal' | 'onboarding' | 'confirm' | null

interface UiStore {
  overlay: OverlayId
  /** Object detail panel open state, mirrored from the game store. */
  panelOpen: boolean
  mobileSheetOpen: boolean
  /** True while any blocking surface is open; freezes world input. */
  blocking: boolean

  openOverlay: (id: Exclude<OverlayId, null>) => void
  closeOverlay: () => void
  setPanelOpen: (open: boolean) => void
  setMobileSheetOpen: (open: boolean) => void
}

export const useUiStore = create<UiStore>()((set) => ({
  overlay: null,
  panelOpen: false,
  mobileSheetOpen: false,
  blocking: false,

  openOverlay: (id) => set({ overlay: id, blocking: true }),
  closeOverlay: () => set({ overlay: null, blocking: false }),
  setPanelOpen: (open) => set({ panelOpen: open }),
  setMobileSheetOpen: (open) => set({ mobileSheetOpen: open }),
}))

/** Selector: is a blocking overlay currently open? */
export const selectBlocking = (state: UiStore): boolean => state.blocking
