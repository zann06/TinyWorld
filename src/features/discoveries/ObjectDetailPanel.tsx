import { AnimatePresence, motion } from 'motion/react'
import { Check, Compass, MapPin } from 'lucide-react'
import { CATEGORY_LABELS, getObjectById } from '@/data/objects'
import { useActiveDiscoveries, useActiveIsland } from '@/store/game-store'
import { useSettingsStore } from '@/store/settings-store'

export interface ObjectDetailPanelProps {
  open: boolean
  objectId: string | null
  onClose: () => void
  onInteract: (id: string) => void
}

/**
 * Object detail panel.
 *
 * Bottom sheet on phones, docked side panel on tablet and up. All information is
 * real HTML text so the content is readable by assistive technology and by
 * anyone who cannot use the 3D viewport.
 */
export function ObjectDetailPanel({ open, objectId, onClose, onInteract }: ObjectDetailPanelProps) {
  const discoveries = useActiveDiscoveries()
  const island = useActiveIsland()
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)

  const object = objectId ? getObjectById(island, objectId) : undefined
  const found = object ? discoveries.some((entry) => entry.id === object.id) : false

  return (
    <AnimatePresence>
      {open && object ? (
        <>
          {/* Scrim — closes the sheet on tap without blocking the canvas long-term. */}
          <motion.button
            type="button"
            aria-label="Close object details"
            onClick={onClose}
            className="absolute inset-0 z-30 cursor-default bg-deep/35 sm:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.aside
            key="detail"
            aria-label={`${object.name} details`}
            data-testid="object-detail-panel"
            initial={reducedMotion ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: reducedMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="tw-panel tw-scroll absolute inset-x-0 bottom-0 z-40 max-h-[62vh] overflow-y-auto rounded-b-none sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-96 sm:rounded-b-none sm:rounded-l-[var(--radius-panel)]"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-forest/15 bg-cream/95 px-4 py-3 backdrop-blur-sm sm:px-5 sm:py-4">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-forest uppercase">
                  {found ? (
                    <Check size={13} aria-hidden="true" className="text-leaf" />
                  ) : (
                    <MapPin size={13} aria-hidden="true" />
                  )}
                  {CATEGORY_LABELS[object.category]}
                </p>
                <h2 className="font-display mt-0.5 text-lg leading-tight font-bold text-deep sm:text-xl">
                  {object.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${object.name} details`}
                className="shrink-0 rounded-full p-2 text-muted transition hover:bg-forest/10 hover:text-deep active:scale-95"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>

            <div className="space-y-4 px-4 py-4 sm:px-5">
              <p className={`text-sm leading-relaxed ${found ? 'text-deep/85' : 'text-muted'}`}>
                {found ? object.description : object.summary}
              </p>

              {!found ? (
                <p className="rounded-xl border border-dashed border-forest/30 px-3 py-2.5 text-xs text-muted">
                  Interact with this landmark to record it in your journal.
                </p>
              ) : null}

              {found && object.lore ? (
                <blockquote className="rounded-xl bg-sun/25 px-3 py-2.5 text-sm text-muted italic">
                  {object.lore}
                </blockquote>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                {object.interactable ? (
                  <button
                    type="button"
                    onClick={() => onInteract(object.id)}
                    data-testid="panel-interact"
                    className="inline-flex items-center gap-2 rounded-full bg-forest px-4 py-2.5 text-sm font-semibold text-cream transition hover:bg-leaf active:scale-95"
                  >
                    <Compass size={15} aria-hidden="true" />
                    {object.actionLabel ?? 'Explore'}
                  </button>
                ) : null}

                <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 px-3 py-2 text-xs font-semibold text-muted">
                  {found ? 'Discovered' : 'Undiscovered'}
                </span>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
