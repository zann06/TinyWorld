import { useCallback, useRef, useState } from 'react'
import { Hand, MoveDiagonal } from 'lucide-react'
import { movementState } from '@/game/input/useKeyboardControls'
import { useGameStore } from '@/store/game-store'
import { promptLabel } from '@/game/interaction/interaction'

/**
 * Touch controls: an analog thumbstick on the left, a large action button on
 * the right. The stick is pointer-captured, so a drag never leaves the widget,
 * and it never blocks the panel or the canvas tap targets above it.
 */
export function TouchControls() {
  const nearbyId = useGameStore((s) => s.nearbyId)
  const selectedId = useGameStore((s) => s.selectedId)
  const interact = useGameStore((s) => s.interact)

  const stickRef = useRef<HTMLDivElement>(null)
  const pointerId = useRef<number | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  const targetId = nearbyId ?? selectedId
  const label = promptLabel(targetId)

  const resetStick = useCallback(() => {
    pointerId.current = null
    setKnob({ x: 0, y: 0 })
    movementState.touchAxis.x = 0
    movementState.touchAxis.y = 0
  }, [])

  const moveStick = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== event.pointerId) return

    const element = stickRef.current
    if (!element) return

    const rect = element.getBoundingClientRect()
    const centreX = rect.left + rect.width / 2
    const centreY = rect.top + rect.height / 2
    const radius = rect.width / 2

    let dx = (event.clientX - centreX) / radius
    let dy = (event.clientY - centreY) / radius
    const magnitude = Math.hypot(dx, dy)

    if (magnitude > 1) {
      dx /= magnitude
      dy /= magnitude
    }

    setKnob({ x: dx, y: dy })
    // Screen +Y is forward on the stick; the movement code treats +Z as forward.
    movementState.touchAxis.x = dx
    movementState.touchAxis.y = -dy
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {/* Movement stick */}
      <div
        ref={stickRef}
        role="application"
        aria-label="Movement joystick. Drag to move the explorer."
        data-testid="touch-stick"
        onPointerDown={(event) => {
          if (pointerId.current !== null) return
          pointerId.current = event.pointerId
          event.currentTarget.setPointerCapture(event.pointerId)
          moveStick(event)
        }}
        onPointerMove={moveStick}
        onPointerUp={resetStick}
        onPointerCancel={resetStick}
        className="pointer-events-auto absolute bottom-24 left-4 grid size-28 touch-none place-items-center rounded-full border-2 border-cream/30 bg-deep/40 backdrop-blur-sm"
      >
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-full bg-cream/85 text-deep shadow-soft"
          style={{ transform: `translate(${knob.x * 38}px, ${knob.y * 38}px)` }}
        >
          <MoveDiagonal size={20} />
        </span>
        <span className="sr-only">
          Move the explorer by dragging in any direction. Release to stop.
        </span>
      </div>

      {/* Interaction button */}
      <button
        type="button"
        disabled={!label}
        onClick={() => {
          if (targetId) interact(targetId)
        }}
        data-testid="touch-interact"
        aria-label={label ? `${label}` : 'No landmark nearby to interact with'}
        className={`pointer-events-auto absolute right-4 bottom-24 grid size-20 place-items-center rounded-full border-2 font-semibold shadow-lift transition active:scale-95 disabled:opacity-45 ${
          label
            ? 'border-sun bg-sun text-deep'
            : 'pointer-events-none border-cream/30 bg-deep/50 text-muted-dark'
        }`}
      >
        <span className="flex flex-col items-center gap-1 px-2 text-center text-[11px] leading-tight">
          <Hand size={22} aria-hidden="true" />
          {label ?? 'Nothing nearby'}
        </span>
      </button>
    </div>
  )
}
