import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  ACTION_KEYS,
  EMPTY_MOVE_VECTOR,
  MOVE_KEYS,
  MOVEMENT_CODES,
  isEditableTarget,
  isInsideDialog,
  moveVectorToInput,
  readMoveVector,
  resolveAction,
} from '@/game/input/input'
import {
  movementState,
  resetMovementState,
  useKeyboardControls,
} from '@/game/input/useKeyboardControls'

/** Dispatch a cancelable keydown so `defaultPrevented` can be inspected. */
function press(code: string, target: EventTarget = document.body): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

afterEach(() => {
  resetMovementState()
})

describe('readMoveVector', () => {
  it('reads no movement when nothing is pressed', () => {
    expect(readMoveVector([])).toEqual(EMPTY_MOVE_VECTOR)
  })

  it('maps WASD keys', () => {
    expect(readMoveVector(['KeyW'])).toMatchObject({ forward: true })
    expect(readMoveVector(['KeyS'])).toMatchObject({ back: true })
    expect(readMoveVector(['KeyA'])).toMatchObject({ left: true })
    expect(readMoveVector(['KeyD'])).toMatchObject({ right: true })
  })

  it('supports the arrow keys as an alternative', () => {
    expect(readMoveVector(['ArrowUp']).forward).toBe(true)
    expect(readMoveVector(['ArrowLeft']).left).toBe(true)
  })

  it('reports diagonal movement when two keys are held', () => {
    expect(readMoveVector(['KeyW', 'KeyD'])).toMatchObject({ forward: true, right: true })
  })

  it('releases a direction when the key is removed', () => {
    expect(readMoveVector(['KeyW']).forward).toBe(true)
    expect(readMoveVector([]).forward).toBe(false)
  })

  it('ignores unrelated keys', () => {
    expect(readMoveVector(['KeyQ', 'ShiftLeft'])).toEqual(EMPTY_MOVE_VECTOR)
  })
})

describe('moveVectorToInput', () => {
  it('returns a zero vector when idle', () => {
    expect(moveVectorToInput(EMPTY_MOVE_VECTOR)).toEqual({ x: 0, z: 0 })
  })

  it('maps forward to positive Z', () => {
    expect(moveVectorToInput({ forward: true, back: false, left: false, right: false })).toEqual({
      x: 0,
      z: 1,
    })
  })

  it('maps right to positive X', () => {
    expect(moveVectorToInput({ forward: false, back: false, left: false, right: true })).toEqual({
      x: 1,
      z: 0,
    })
  })

  it('normalises diagonals to unit length', () => {
    const result = moveVectorToInput({ forward: true, back: false, left: false, right: true })
    expect(Math.hypot(result.x, result.z)).toBeCloseTo(1, 6)
  })

  it('cancels opposing keys', () => {
    expect(moveVectorToInput({ forward: true, back: true, left: false, right: false })).toEqual({
      x: 0,
      z: 0,
    })
  })
})

describe('resolveAction', () => {
  it('maps E to interact', () => {
    expect(resolveAction('KeyE')).toBe('interact')
  })

  it('maps Escape to escape', () => {
    expect(resolveAction('Escape')).toBe('escape')
  })

  it('returns null for unbound keys', () => {
    expect(resolveAction('KeyQ')).toBeNull()
  })

  it('never maps a movement key to a discrete action', () => {
    for (const codes of Object.values(ACTION_KEYS)) {
      for (const code of codes) {
        expect(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown']).not.toContain(code)
      }
    }
  })
})

describe('input guards', () => {
  it('detects editable targets so typing never moves the player', () => {
    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    document.body.append(input, textarea)

    expect(isEditableTarget(input)).toBe(true)
    expect(isEditableTarget(textarea)).toBe(true)
    expect(isEditableTarget(document.createElement('div'))).toBe(false)
    expect(isEditableTarget(null)).toBe(false)
  })

  it('detects focus inside an open dialog', () => {
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    const button = document.createElement('button')
    dialog.append(button)
    document.body.append(dialog)

    expect(isInsideDialog(button)).toBe(true)
    expect(isInsideDialog(document.createElement('div'))).toBe(false)
  })
})

describe('MOVEMENT_CODES', () => {
  it('covers every WASD and arrow binding', () => {
    for (const codes of Object.values(MOVE_KEYS)) {
      for (const code of codes) {
        expect(MOVEMENT_CODES.has(code)).toBe(true)
      }
    }
  })

  it('never lists a discrete action key', () => {
    for (const codes of Object.values(ACTION_KEYS)) {
      for (const code of codes) {
        expect(MOVEMENT_CODES.has(code)).toBe(false)
      }
    }
  })
})

describe('useKeyboardControls', () => {
  it('suppresses the browser scroll default for the arrow keys it consumes', () => {
    renderHook(() => useKeyboardControls({ enabled: true, onAction: () => {} }))

    for (const code of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      expect(press(code).defaultPrevented).toBe(true)
    }
  })

  it('still tracks the arrow keys for movement', () => {
    renderHook(() => useKeyboardControls({ enabled: true, onAction: () => {} }))

    press('ArrowRight')
    press('ArrowUp')
    expect(readMoveVector(movementState.pressed)).toMatchObject({ right: true, forward: true })

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' }))
    expect(readMoveVector(movementState.pressed)).toMatchObject({ right: false, forward: true })
  })

  it('leaves arrow keys alone while a dialog owns focus', () => {
    renderHook(() => useKeyboardControls({ enabled: true, onAction: () => {} }))

    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    const button = document.createElement('button')
    dialog.append(button)
    document.body.append(dialog)

    // A dialog can scroll its own content, so the browser default must stand.
    expect(press('ArrowDown', button).defaultPrevented).toBe(false)
  })

  it('leaves arrow keys alone while typing in a field', () => {
    renderHook(() => useKeyboardControls({ enabled: true, onAction: () => {} }))

    const input = document.createElement('input')
    document.body.append(input)

    expect(press('ArrowLeft', input).defaultPrevented).toBe(false)
    expect(movementState.pressed.size).toBe(0)
  })

  it('does not track movement when input is disabled', () => {
    renderHook(() => useKeyboardControls({ enabled: false, onAction: () => {} }))

    press('ArrowUp')
    expect(movementState.pressed.size).toBe(0)
  })

  it('drops held keys when the window loses focus', () => {
    renderHook(() => useKeyboardControls({ enabled: true, onAction: () => {} }))

    press('ArrowUp')
    window.dispatchEvent(new Event('blur'))
    expect(movementState.pressed.size).toBe(0)
  })
})
