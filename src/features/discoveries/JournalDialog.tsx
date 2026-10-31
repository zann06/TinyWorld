import { Dialog } from '@/components/ui/Dialog'
import { ObjectDirectory } from '@/features/discoveries/ObjectDirectory'
import { LegacyPanel } from '@/features/quests/LegacyPanel'
import { StoryPanel } from '@/features/story/StoryPanel'
import { useActiveIsland } from '@/store/game-store'

export interface JournalDialogProps {
  open: boolean
  onClose: () => void
}

/** The discovery journal: the settlers' story, the Legacy trail and every landmark. */
export function JournalDialog({ open, onClose }: JournalDialogProps) {
  const island = useActiveIsland()

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Discovery journal"
      description={`The settlers' story, the Legacy trail and every landmark on ${island.name}, found or not.`}
      size="lg"
    >
      <div className="flex flex-col gap-5">
        <StoryPanel />
        <LegacyPanel onClose={onClose} />
        <ObjectDirectory headingLevel={3} />
      </div>
    </Dialog>
  )
}
