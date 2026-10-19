import { useEffect } from 'react'
import { useSettingsStore } from '@/store/settings-store'
import { applyReducedMotionAttribute } from '@/store/persistence'

/**
 * Application-level React bindings.
 *
 * Persisted state is hydrated in `main.tsx` *before* React mounts, so this
 * provider only has to keep external systems in sync with state.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const reducedMotion = useSettingsStore((state) => state.reducedMotion)

  useEffect(() => {
    applyReducedMotionAttribute(reducedMotion)
  }, [reducedMotion])

  return children
}
