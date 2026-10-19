import { Dialog } from '@/components/ui/Dialog'
import { ObjectDirectory } from '@/features/discoveries/ObjectDirectory'

export interface JournalDialogProps {
  open: boolean
  onClose: () => void
}

/** The discovery journal: every landmark, found or not. */
export function JournalDialog({ open, onClose }: JournalDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Discovery journal"
      description="Every landmark on Greenhaven Island, and what you have found so far."
      size="lg"
    >
      <ObjectDirectory headingLevel={3} />
    </Dialog>
  )
}
