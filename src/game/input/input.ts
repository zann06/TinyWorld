import type { Vec2 } from '@/types'

/**
 * Input mapping.
 *
 * Pure functions so the key mapping can be unit tested without a DOM. The
 * browser-specific listener wiring lives in `useKeyboardControls`.
 */

export const MOVE_KEYS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
} as const

export type MoveDirection = keyof typeof MOVE_KEYS

export type MoveVector = Record<MoveDirection, boolean>

/**
 * Every `KeyboardEvent.code` that drives movement.
 *
 * Arrow keys scroll the document (and the scrollable object detail sheet) by
 * default, so the listener uses this set to suppress that default when the
 * world is the one consuming the key.
 */
export const MOVEMENT_CODES: ReadonlySet<string> = new Set(Object.values(MOVE_KEYS).flat())

export const EMPTY_MOVE_VECTOR: MoveVector = {
  forward: false,
  back: false,
  left: false,
  right: false,
}

/** Build a movement vector from the currently pressed `KeyboardEvent.code` values. */
export function readMoveVector(codes: Iterable<string>): MoveVector {
  const active = new Set(codes)
  const vector: MoveVector = { ...EMPTY_MOVE_VECTOR }

  for (const direction of Object.keys(MOVE_KEYS) as MoveDirection[]) {
    vector[direction] = MOVE_KEYS[direction].some((code) => active.has(code))
  }

  return vector
}

/**
 * Convert a movement vector into a normalised screen-space direction.
 * Screen space is +Z forward and +X right, before the camera yaw is applied.
 */
export function moveVectorToInput(vector: MoveVector): Vec2 {
  let x = 0
  let z = 0

  if (vector.forward) z += 1
  if (vector.back) z -= 1
  if (vector.right) x += 1
  if (vector.left) x -= 1

  const length = Math.hypot(x, z)
  if (length === 0) return { x: 0, z: 0 }

  return { x: x / length, z: z / length }
}

export type GameAction = 'interact' | 'escape' | 'toggleJournal' | 'toggleSettings' | 'photoMode'

/** Keys that trigger a discrete action. */
export const ACTION_KEYS: Record<GameAction, readonly string[]> = {
  interact: ['KeyE', 'Enter', 'Space'],
  escape: ['Escape'],
  toggleJournal: ['KeyJ'],
  toggleSettings: ['KeyP'],
  photoMode: ['KeyF'],
}

/** Map a key code to a game action, or null when it maps to nothing. */
export function resolveAction(code: string): GameAction | null {
  for (const [action, codes] of Object.entries(ACTION_KEYS) as [GameAction, readonly string[]][]) {
    if (codes.includes(code)) return action
  }
  return null
}

/** True when the event target is a text-entry surface that must swallow shortcuts. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return target.isContentEditable === true
}

/** True when focus sits inside an open dialog, where game keys must not fire. */
export function isInsideDialog(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('[role="dialog"]') !== null
}
