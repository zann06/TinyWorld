/**
 * WebGL capability detection.
 *
 * TinyWorld renders through WebGL 2. When it is unavailable — old browsers,
 * blocked drivers, remote desktops — the app must degrade to an explanation
 * and an accessible DOM-only directory rather than a blank screen.
 */

export interface WebGLSupport {
  supported: boolean
  reason: string | null
}

const FAILURE_MESSAGE =
  'This browser cannot start WebGL 2, which TinyWorld needs to draw the 3D world.'

export function detectWebGLSupport(): WebGLSupport {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { supported: false, reason: 'Rendering is only available in a browser.' }
  }

  if (typeof WebGL2RenderingContext === 'undefined') {
    return { supported: false, reason: FAILURE_MESSAGE }
  }

  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false })

    if (!context) {
      return { supported: false, reason: FAILURE_MESSAGE }
    }

    // Release the probe context immediately so it does not count against the
    // browser's limit on simultaneously active WebGL contexts.
    context.getExtension('WEBGL_lose_context')?.loseContext()

    return { supported: true, reason: null }
  } catch (error) {
    return {
      supported: false,
      reason: error instanceof Error ? `${FAILURE_MESSAGE} (${error.message})` : FAILURE_MESSAGE,
    }
  }
}
