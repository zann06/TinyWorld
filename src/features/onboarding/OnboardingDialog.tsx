import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { useGameStore } from '@/store/game-store'
import { ISLAND_NAME, ISLAND_TAGLINE } from '@/data/world'

export interface OnboardingDialogProps {
  open: boolean
  /** Called when the guide is dismissed or completed. */
  onClose: () => void
}

/** First-visit controls guide. Detects touch and shows the matching scheme. */
export function OnboardingDialog({ open, onClose }: OnboardingDialogProps) {
  const [touch, setTouch] = useState(false)

  const complete = useGameStore((s) => s.completeOnboarding)
  const pushToast = useGameStore((s) => s.pushToast)

  // Detect the input scheme when the dialog first opens.
  if (open && touch === false && typeof window !== 'undefined') {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
    if (coarse) setTouch(true)
  }

  const finish = (): void => {
    complete()
    onClose()
    pushToast({
      title: `Welcome to ${ISLAND_NAME}`,
      description: 'Explore the coast path and press E at each landmark.',
      variant: 'info',
    })
  }

  return (
    <Dialog open={open} onClose={finish} title={ISLAND_NAME} description={ISLAND_TAGLINE} size="md">
      <div className="space-y-5">
        <section>
          <h3 className="text-sm font-bold tracking-wide text-forest uppercase">Move</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            {touch ? (
              <li>Drag the joystick at the bottom-left to walk.</li>
            ) : (
              <>
                <li>
                  <kbd className="rounded bg-forest/10 px-1.5 py-0.5 font-mono text-xs">W</kbd>{' '}
                  <kbd className="rounded bg-forest/10 px-1.5 py-0.5 font-mono text-xs">A</kbd>{' '}
                  <kbd className="rounded bg-forest/10 px-1.5 py-0.5 font-mono text-xs">S</kbd>{' '}
                  <kbd className="rounded bg-forest/10 px-1.5 py-0.5 font-mono text-xs">D</kbd> or
                  the arrow keys to walk.
                </li>
                <li>Drag anywhere on the world to look around. Scroll to zoom.</li>
              </>
            )}
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-bold tracking-wide text-forest uppercase">Discover</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            <li>Click or tap a landmark to open its details.</li>
            <li>
              {touch ? (
                'Use the action button on the right to interact.'
              ) : (
                <>
                  Press{' '}
                  <kbd className="rounded bg-forest/10 px-1.5 py-0.5 font-mono text-xs">E</kbd> to
                  interact with what you are standing next to.
                </>
              )}
            </li>
            <li>
              Press <kbd className="rounded bg-forest/10 px-1.5 py-0.5 font-mono text-xs">Esc</kbd>{' '}
              to close a panel.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-bold tracking-wide text-forest uppercase">
            No mouse? No problem
          </h3>
          <p className="mt-2 text-sm text-muted">
            Open the journal at any time to read every landmark as plain text and select it without
            touching the 3D view.
          </p>
        </section>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={finish}
            data-testid="onboarding-start"
            className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-leaf active:scale-95"
          >
            Start exploring
          </button>
        </div>
      </div>
    </Dialog>
  )
}
