import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BookOpen, Camera, Hand, Keyboard, MousePointer2, Sparkles, X } from 'lucide-react'
import { CATEGORY_LABELS, getObjectById } from '@/data/objects'
import { promptLabel } from '@/game/interaction/interaction'
import { useActiveDiscoveries, useActiveIsland, useGameStore } from '@/store/game-store'
import { useUiStore } from '@/store/ui-store'
import { useSettingsStore } from '@/store/settings-store'
import { ObjectDetailPanel } from '@/features/discoveries/ObjectDetailPanel'
import { TouchControls } from '@/features/exploration/TouchControls'

/**
 * The exploration HUD: contextual prompt, object detail panel, bottom control
 * hints and the mobile control layer.
 */
export function InteractionLayer() {
  const nearbyId = useGameStore((s) => s.nearbyId)
  const selectedId = useGameStore((s) => s.selectedId)
  const panelOpen = useGameStore((s) => s.panelOpen)
  const island = useActiveIsland()
  const discoveries = useActiveDiscoveries()
  const interact = useGameStore((s) => s.interact)
  const closePanel = useGameStore((s) => s.closePanel)

  const reducedMotion = useSettingsStore((s) => s.reducedMotion)
  const openOverlay = useUiStore((s) => s.openOverlay)
  const setPanelOpen = useUiStore((s) => s.setPanelOpen)

  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)')
    const update = (): void => setIsTouch(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const activeId = nearbyId ?? selectedId
  const prompt = promptLabel(island, activeId)
  const selected = selectedId ? getObjectById(island, selectedId) : undefined
  const isFound = selected ? discoveries.some((entry) => entry.id === selected.id) : false

  return (
    <>
      {/* Contextual interaction prompt */}
      <AnimatePresence>
        {prompt && !panelOpen ? (
          <motion.div
            key="prompt"
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
            className="pointer-events-auto absolute bottom-44 left-1/2 z-30 -translate-x-1/2 sm:bottom-24"
          >
            <button
              type="button"
              onClick={() => activeId && interact(activeId)}
              data-testid="interaction-prompt"
              className="tw-panel-deep flex items-center gap-2.5 rounded-full py-2 pr-4 pl-2 transition hover:scale-[1.02] active:scale-95"
            >
              {/* The key badge is meaningless on a touch device. */}
              <kbd className="hidden size-7 place-items-center rounded-full bg-sun font-mono text-xs font-bold text-deep sm:grid">
                E
              </kbd>
              <span className="text-sm font-semibold text-cream">{prompt}</span>
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Object detail panel — bottom sheet on mobile, side panel on desktop */}
      <ObjectDetailPanel
        open={panelOpen}
        objectId={selectedId}
        onClose={() => {
          closePanel()
          setPanelOpen(false)
        }}
        onInteract={(id) => interact(id)}
      />

      {/* Bottom control hints + utilities */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-3 p-3 sm:p-4">
        <div className="tw-panel-deep pointer-events-auto hidden items-center gap-4 rounded-full px-4 py-2 text-xs text-cream/85 sm:flex">
          <span className="flex items-center gap-1.5">
            <Keyboard size={13} aria-hidden="true" /> WASD move
          </span>
          <span className="flex items-center gap-1.5">
            <MousePointer2 size={13} aria-hidden="true" /> Drag to look
          </span>
          <span className="flex items-center gap-1.5">
            <Hand size={13} aria-hidden="true" /> Click to select
          </span>
          <button
            type="button"
            onClick={() => openOverlay('journal')}
            className="flex items-center gap-1.5 rounded-full bg-cream/15 px-2.5 py-1 font-semibold text-cream transition hover:bg-cream/25"
          >
            <BookOpen size={13} aria-hidden="true" /> Journal
          </button>
          <button
            type="button"
            onClick={() => useGameStore.getState().setPhotoMode(true)}
            className="flex items-center gap-1.5 rounded-full bg-cream/15 px-2.5 py-1 font-semibold text-cream transition hover:bg-cream/25"
          >
            <Camera size={13} aria-hidden="true" /> Photo
          </button>
        </div>

        {/* Compact utility bar on small screens */}
        <div className="tw-panel-deep pointer-events-auto flex items-center gap-1.5 rounded-full px-2 py-1.5 sm:hidden">
          <button
            type="button"
            onClick={() => openOverlay('journal')}
            aria-label="Open the discovery journal"
            className="rounded-full p-2 text-cream transition hover:bg-cream/15"
          >
            <BookOpen size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => useGameStore.getState().setPhotoMode(true)}
            aria-label="Enter photo mode"
            className="rounded-full p-2 text-cream transition hover:bg-cream/15"
          >
            <Camera size={17} aria-hidden="true" />
          </button>
          <span className="px-1 text-xs font-semibold text-muted-dark">
            {discoveries.length} found
          </span>
        </div>
      </div>

      {/* Mobile movement + interaction controls */}
      {isTouch ? <TouchControls /> : null}

      {/* First-visit hint, only when nothing else is covering the screen */}
      <AnimatePresence>
        {!panelOpen && !nearbyId && discoveries.length === 0 && !isTouch ? (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-x-0 bottom-32 z-20 flex justify-center px-4"
          >
            <p className="tw-panel-deep flex items-center gap-2 rounded-full px-4 py-2 text-xs text-muted-dark">
              <Sparkles size={13} aria-hidden="true" />
              Welcome to {island.name}. Walk the path and press E at any landmark.
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Selection badge, shown on desktop when the panel is closed */}
      {selected && !panelOpen ? (
        <span className="sr-only" role="status">
          {selected.name} selected — {isFound ? 'discovered' : 'not discovered'}. Category{' '}
          {CATEGORY_LABELS[selected.category]}.
        </span>
      ) : null}

      {/* Close affordance for the panel, duplicated for keyboard users */}
      {panelOpen ? (
        <button
          type="button"
          onClick={() => {
            closePanel()
            setPanelOpen(false)
          }}
          aria-label="Close object details"
          className="sr-only"
        >
          <X aria-hidden="true" />
        </button>
      ) : null}
    </>
  )
}
