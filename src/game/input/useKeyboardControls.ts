import { useEffect } from 'react'
import type { GameAction } from '@/game/input/input'
import { isEditableTarget, isInsideDialog, resolveAction } from '@/game/input/input'
import { MOVEMENT_CODES } from '@/game/input/input'

/**
 * The live movement state.
 *
 * Held in a module-level mutable object on purpose: it changes every frame and
 * must never trigger a React render.
 */
export const movementState = {
  pressed: new Set<string>(),
  /** Analog joystick input from touch controls, -1..1 on both axes. */
  touchAxis: { x: 0, y: 0 },
  /** True while the touch stick is pushed to its edge — the touch sprint. */
  touchSprint: false,
  /** Camera yaw, in radians. Updated by drag-look and touch. */
  yaw: 0.6,
  /** Camera pitch, clamped to a comfortable range. */
  pitch: 0.56,
  /** Camera distance from the player. */
  distance: 34,
  /** Player world position. */
  player: { x: -26, z: 22 },
  /** Smoothed planar velocity, in world units per second. */
  velocity: { x: 0, z: 0 },
  /** Direction the avatar should face, in radians. */
  facing: 0.6,
  /** Current planar speed, used by the avatar animation. */
  speed: 0,
  /** Accumulated look delta consumed once per frame. */
  pendingYawDelta: 0,
  pendingPitchDelta: 0,
  /** Zoom delta applied per frame. */
  pendingZoomDelta: 0,
  /** True while a drag-look gesture is in progress. */
  dragging: false,
}

export function resetMovementState(): void {
  movementState.pressed.clear()
  movementState.touchAxis.x = 0
  movementState.touchAxis.y = 0
  movementState.touchSprint = false
  movementState.pendingYawDelta = 0
  movementState.pendingPitchDelta = 0
  movementState.pendingZoomDelta = 0
  movementState.velocity.x = 0
  movementState.velocity.z = 0
  movementState.speed = 0
  movementState.facing = 0
  movementState.dragging = false
}

export const MIN_CAMERA_DISTANCE = 9
export const MAX_CAMERA_DISTANCE = 62
export const MIN_PITCH = 0.14
export const MAX_PITCH = 1.35

export interface KeyboardControlsOptions {
  enabled: boolean
  onAction: (action: GameAction) => void
}

/**
 * Global keyboard listener.
 *
 * Movement keys are tracked in a Set so the frame loop can read them without
 * re-subscribing. Discrete actions are dispatched to a callback.
 */
export function useKeyboardControls({ enabled, onAction }: KeyboardControlsOptions): void {
  useEffect(() => {
    if (!enabled) {
      movementState.pressed.clear()
      return
    }

    const handleDown = (event: KeyboardEvent): void => {
      // Never hijack typing, or movement while a dialog owns the screen.
      if (isEditableTarget(event.target)) return

      const insideDialog = isInsideDialog(event.target)

      // Arrow keys scroll the document and the object detail sheet by default.
      // When the world consumes the key, walking must not also scroll.
      if (!insideDialog && MOVEMENT_CODES.has(event.code)) {
        event.preventDefault()
      }

      movementState.pressed.add(event.code)

      const action = resolveAction(event.code)
      if (action && !insideDialog) {
        onAction(action)
      }
    }

    const handleUp = (event: KeyboardEvent): void => {
      movementState.pressed.delete(event.code)
    }

    const handleBlur = (): void => {
      // Losing focus with keys held would leave the player walking forever.
      movementState.pressed.clear()
      movementState.touchAxis.x = 0
      movementState.touchAxis.y = 0
      movementState.touchSprint = false
    }

    window.addEventListener('keydown', handleDown)
    window.addEventListener('keyup', handleUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleDown)
      window.removeEventListener('keyup', handleUp)
      window.removeEventListener('blur', handleBlur)
      movementState.pressed.clear()
    }
  }, [enabled, onAction])
}

/** Global drag-look listener over the canvas element. */
export function useDragLook(target: HTMLElement | null, sensitivity: number): void {
  useEffect(() => {
    if (!target) return

    let pointerId: number | null = null
    let lastX = 0
    let lastY = 0

    const onPointerDown = (event: PointerEvent): void => {
      // Primary button / single touch starts a look gesture. Right-click and
      // middle-click are left to the browser.
      if (event.button !== 0) return
      pointerId = event.pointerId
      lastX = event.clientX
      lastY = event.clientY
      movementState.dragging = true
      target.setPointerCapture?.(event.pointerId)
    }

    const onPointerMove = (event: PointerEvent): void => {
      if (pointerId !== event.pointerId) return
      const dx = event.clientX - lastX
      const dy = event.clientY - lastY
      lastX = event.clientX
      lastY = event.clientY

      movementState.pendingYawDelta -= dx * 0.005 * sensitivity
      movementState.pendingPitchDelta -= dy * 0.004 * sensitivity
    }

    const endDrag = (event: PointerEvent): void => {
      if (pointerId !== event.pointerId) return
      pointerId = null
      movementState.dragging = false
      target.releasePointerCapture?.(event.pointerId)
    }

    const onWheel = (event: WheelEvent): void => {
      event.preventDefault()
      movementState.pendingZoomDelta += event.deltaY * 0.02
    }

    target.addEventListener('pointerdown', onPointerDown)
    target.addEventListener('pointermove', onPointerMove)
    target.addEventListener('pointerup', endDrag)
    target.addEventListener('pointercancel', endDrag)
    target.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      target.removeEventListener('pointerdown', onPointerDown)
      target.removeEventListener('pointermove', onPointerMove)
      target.removeEventListener('pointerup', endDrag)
      target.removeEventListener('pointercancel', endDrag)
      target.removeEventListener('wheel', onWheel)
    }
  }, [target, sensitivity])
}
