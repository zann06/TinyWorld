import { useSettingsStore } from '@/store/settings-store'
import { useGameStore } from '@/store/game-store'
import { isStorageAvailable } from '@/lib/storage'

/**
 * One-shot hydration of every persisted slice.
 * Called once before the app renders interactive content.
 */
export function hydrateStores(): { storageAvailable: boolean } {
  useSettingsStore.getState().hydrate()
  useGameStore.getState().hydrate()

  return { storageAvailable: isStorageAvailable() }
}

/** Restore the stored "reduced motion" flag onto the document element. */
export function applyReducedMotionAttribute(reduced: boolean): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset['reducedMotion'] = reduced ? 'true' : 'false'
}
