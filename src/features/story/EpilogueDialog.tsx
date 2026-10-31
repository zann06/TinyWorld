import { Bell } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { EPILOGUE_FRAGMENT_ID, getFragmentById } from '@/data/story'
import { useUiStore } from '@/store/ui-store'

export interface EpilogueDialogProps {
  open: boolean
  onClose: () => void
}

/**
 * The campaign's closing moment.
 *
 * Shown exactly once — on the interaction that completes the Legacy trail —
 * and re-readable afterwards as the final journal entry. Nothing is
 * persisted: the trigger is the completion itself, so returning explorers are
 * never re-interrupted.
 */
export function EpilogueDialog({ open, onClose }: EpilogueDialogProps) {
  const openOverlay = useUiStore((state) => state.openOverlay)
  const fragment = getFragmentById(EPILOGUE_FRAGMENT_ID)

  if (!fragment) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="The Tide Bell rings"
      description="The Legacy trail is complete."
      size="md"
    >
      <div data-testid="epilogue-dialog">
        <span
          aria-hidden="true"
          className="mx-auto grid size-12 place-items-center rounded-full bg-forest text-cream"
        >
          <Bell size={20} />
        </span>
        <p className="mt-3 text-center font-display text-lg font-bold text-deep">
          {fragment.title}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{fragment.body}</p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            data-testid="epilogue-journal"
            onClick={() => {
              onClose()
              openOverlay('journal')
            }}
            className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-leaf active:scale-95"
          >
            Re-read the story
          </button>
          <button
            type="button"
            data-testid="epilogue-close"
            onClick={onClose}
            className="rounded-full border border-forest/25 px-5 py-2.5 text-sm font-semibold text-deep transition hover:bg-forest/10 active:scale-95"
          >
            Keep exploring
          </button>
        </div>
      </div>
    </Dialog>
  )
}
