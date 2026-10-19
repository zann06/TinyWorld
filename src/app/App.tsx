import { Suspense, lazy, useState } from 'react'
import { Settings2 } from 'lucide-react'
import { AppProviders } from '@/app/providers'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { ToastHost } from '@/components/feedback/ToastHost'
import { SettingsDialog } from '@/features/settings/SettingsDialog'
import { OnboardingDialog } from '@/features/onboarding/OnboardingDialog'
import { JournalDialog } from '@/features/discoveries/JournalDialog'
import { WebGLUnavailable } from '@/features/exploration/WebGLUnavailable'
import { SceneChunkFallback } from '@/features/exploration/SceneLoader'
import { TopBar } from '@/components/layout/TopBar'
import { AmbientAudio } from '@/lib/audio'
import { useSettingsStore } from '@/store/settings-store'
import { useUiStore } from '@/store/ui-store'
import { detectWebGLSupport } from '@/lib/webgl'
import { STORAGE_KEYS, readFlag, writeFlag } from '@/lib/storage'

/**
 * The 3D island is the only thing that pulls in Three.js and React Three
 * Fiber, so it loads as its own chunk. The interface — top bar, island
 * directory, journal, settings and the onboarding dialog — is usable while the
 * renderer is still streaming in.
 */
const WorldCanvas = lazy(() =>
  import('@/world/WorldCanvas').then((module) => ({ default: module.WorldCanvas })),
)

function TinyWorldApp() {
  const showHud = useSettingsStore((state) => state.showHud)
  const overlay = useUiStore((state) => state.overlay)
  const openOverlay = useUiStore((state) => state.openOverlay)
  const closeOverlay = useUiStore((state) => state.closeOverlay)

  // WebGL capability is cheap and synchronous, so it is checked once on mount.
  const [webgl] = useState(() => detectWebGLSupport())

  // The controls guide is shown on the very first visit only. It opens as soon
  // as the app mounts rather than after a delay, so its timing never depends on
  // how long the GPU takes to start.
  const [onboardingDismissed, setOnboardingDismissed] = useState(() =>
    readFlag(STORAGE_KEYS.onboarding),
  )

  const handleOnboardingClose = (): void => {
    writeFlag(STORAGE_KEYS.onboarding, true)
    setOnboardingDismissed(true)
    closeOverlay()
  }

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-deep">
      <a
        href="#tinyworld-object-directory"
        className="tw-sr-only-focusable absolute top-3 left-3 z-50 rounded-full bg-cream px-4 py-2 text-sm font-semibold text-deep"
      >
        Skip to the island directory
      </a>

      <AmbientAudio />

      {/*
        The header sits outside <main> so it is exposed as a real `banner`
        landmark rather than being flattened to a generic container.
      */}
      {showHud ? (
        <TopBar onOpenSettings={() => openOverlay('settings')} openSettingsLabel="Open settings" />
      ) : (
        <button
          type="button"
          onClick={() => openOverlay('settings')}
          aria-label="Open settings"
          className="tw-panel-deep absolute top-4 right-4 z-30 rounded-full p-2.5 text-cream shadow-soft transition hover:bg-deep"
        >
          <Settings2 size={18} aria-hidden="true" />
        </button>
      )}

      <main className="relative flex-1" aria-label="Greenhaven Island">
        <ErrorBoundary title="The world stopped rendering">
          {webgl.supported ? (
            <Suspense fallback={<SceneChunkFallback />}>
              <WorldCanvas />
            </Suspense>
          ) : (
            <WebGLUnavailable reason={webgl.reason} />
          )}
        </ErrorBoundary>
      </main>

      <ToastHost />
      <SettingsDialog open={overlay === 'settings'} onClose={closeOverlay} />
      <JournalDialog open={overlay === 'journal'} onClose={closeOverlay} />
      <OnboardingDialog
        open={!onboardingDismissed && overlay === null}
        onClose={handleOnboardingClose}
      />
    </div>
  )
}

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <TinyWorldApp />
      </AppProviders>
    </ErrorBoundary>
  )
}

export default App
