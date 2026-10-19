import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Download, Eye, RotateCcw, Settings2, X } from 'lucide-react'
import { useGameStore } from '@/store/game-store'
import { useUiStore } from '@/store/ui-store'
import { ISLAND_NAME } from '@/data/world'
import { getRenderer } from '@/lib/renderer-bridge'
import {
  MAX_CAMERA_DISTANCE,
  MIN_CAMERA_DISTANCE,
  movementState,
} from '@/game/input/useKeyboardControls'

/**
 * Photo mode.
 *
 * Hides the HUD, unlocks the camera, and exports the live renderer output —
 * never a placeholder image. The Canvas is created with
 * `preserveDrawingBuffer: true` so the framebuffer can be read back.
 */
export function PhotoModeOverlay() {
  const setPhotoMode = useGameStore((s) => s.setPhotoMode)
  const openOverlay = useUiStore((s) => s.openOverlay)
  const pushToast = useGameStore((s) => s.pushToast)

  const [chromeVisible, setChromeVisible] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const restoreRef = useRef<{ distance: number; pitch: number; yaw: number } | null>(null)

  // Remember the exploration camera when photo mode opens; this overlay mounts
  // only while photo mode is active.
  useEffect(() => {
    restoreRef.current = {
      distance: movementState.distance,
      pitch: movementState.pitch,
      yaw: movementState.yaw,
    }
  }, [])

  const exit = useCallback(() => {
    const restore = restoreRef.current
    if (restore) {
      movementState.distance = restore.distance
      movementState.pitch = restore.pitch
      movementState.yaw = restore.yaw
      restoreRef.current = null
    }
    setPhotoMode(false)
  }, [setPhotoMode])

  const capture = useCallback(() => {
    const { renderer, scene, camera } = getRenderer()

    if (!renderer || !scene || !camera) {
      const message = 'The renderer is not ready yet. Wait a moment and try again.'
      setError(message)
      pushToast({ title: 'Screenshot failed', description: message, variant: 'error' })
      return
    }

    setBusy(true)
    setError(null)

    try {
      // Render explicitly so the buffer is guaranteed to hold the current frame.
      renderer.render(scene, camera)

      const dataUrl = renderer.domElement.toDataURL('image/png')
      if (!dataUrl.startsWith('data:image/png')) {
        throw new Error('The renderer returned an unsupported image format.')
      }

      const link = document.createElement('a')
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      link.href = dataUrl
      link.download = `tinyworld-greenhaven-${stamp}.png`
      document.body.append(link)
      link.click()
      link.remove()

      pushToast({
        title: 'Screenshot saved',
        description: 'Your Greenhaven Island photo was downloaded as a PNG.',
        variant: 'success',
      })
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'The screenshot could not be generated.'
      setError(message)
      pushToast({ title: 'Screenshot failed', description: message, variant: 'error' })
    } finally {
      setBusy(false)
    }
  }, [pushToast])

  return (
    <div className="absolute inset-0 z-40" data-testid="photo-mode">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-deep/75 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-deep/75 to-transparent" />

      {chromeVisible ? (
        <>
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-4">
            <p className="tw-panel-deep pointer-events-none flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-cream">
              <Camera size={15} aria-hidden="true" />
              Photo mode — {ISLAND_NAME}
            </p>

            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => openOverlay('settings')}
                aria-label="Open photo settings"
                className="tw-panel-deep rounded-full p-2 text-cream transition hover:bg-deep"
              >
                <Settings2 size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setChromeVisible((value) => !value)}
                aria-pressed={!chromeVisible}
                className="tw-panel-deep flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-cream transition hover:bg-deep"
              >
                <Eye size={14} aria-hidden="true" />
                Hide UI
              </button>
              <button
                type="button"
                onClick={exit}
                aria-label="Exit photo mode"
                data-testid="photo-exit"
                className="tw-panel-deep rounded-full p-2 text-cream transition hover:bg-deep"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-2 p-3 sm:p-4">
            <button
              type="button"
              onClick={capture}
              disabled={busy}
              data-testid="photo-capture"
              className="inline-flex items-center gap-2 rounded-full bg-sun px-5 py-3 text-sm font-semibold text-deep shadow-lift transition hover:bg-[#e6bd79] active:scale-95 disabled:opacity-60"
            >
              <Download size={16} aria-hidden="true" />
              {busy ? 'Saving…' : 'Save PNG'}
            </button>

            <div className="tw-panel-deep flex items-center gap-2 rounded-full px-3 py-2.5 text-xs text-cream/85">
              <button
                type="button"
                onClick={() => {
                  movementState.distance = Math.max(MIN_CAMERA_DISTANCE, movementState.distance - 4)
                }}
                aria-label="Zoom in"
                className="rounded-full bg-cream/15 px-2.5 py-1 font-semibold text-cream hover:bg-cream/25"
              >
                Zoom +
              </button>
              <button
                type="button"
                onClick={() => {
                  movementState.distance = Math.min(MAX_CAMERA_DISTANCE, movementState.distance + 4)
                }}
                aria-label="Zoom out"
                className="rounded-full bg-cream/15 px-2.5 py-1 font-semibold text-cream hover:bg-cream/25"
              >
                Zoom −
              </button>
              <button
                type="button"
                onClick={() => {
                  movementState.yaw += Math.PI / 4
                }}
                aria-label="Rotate the view 45 degrees"
                className="flex items-center gap-1 rounded-full bg-cream/15 px-2.5 py-1 font-semibold text-cream hover:bg-cream/25"
              >
                <RotateCcw size={12} aria-hidden="true" />
                Rotate
              </button>
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              data-testid="photo-error"
              className="tw-panel-deep absolute bottom-32 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-sm text-[#f6c4b8]"
            >
              {error}
            </p>
          ) : null}
        </>
      ) : null}

      {!chromeVisible ? (
        <button
          type="button"
          onClick={() => setChromeVisible(true)}
          className="tw-panel-deep absolute top-4 right-4 rounded-full px-3 py-2 text-xs font-semibold text-cream transition hover:bg-deep"
        >
          Show controls
        </button>
      ) : null}
    </div>
  )
}
