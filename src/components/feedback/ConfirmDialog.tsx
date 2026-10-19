import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  /** Extra warning copy shown above the buttons. */
  detail?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Explicit confirmation for destructive actions.
 * Escape and the backdrop are intentionally disabled so the choice must be
 * made deliberately.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  detail,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false)

  const handleConfirm = (): void => {
    setPending(true)
    try {
      onConfirm()
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      dismissible={false}
      size="sm"
    >
      {detail ? <p className="mb-4 text-sm text-muted">{detail}</p> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-forest/25 px-4 py-2.5 text-sm font-semibold text-deep transition hover:bg-forest/10 active:scale-95"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className="rounded-full bg-[#a8442a] px-4 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#8e3621] active:scale-95 disabled:opacity-60"
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
