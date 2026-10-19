import { useCallback, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useSettingsStore } from '@/store/settings-store'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Elements that can receive keyboard focus right now.
 * Uses attribute checks rather than layout metrics so the trap behaves the same
 * in a real browser and in a headless DOM.
 */
function getFocusable(panel: HTMLElement): HTMLElement[] {
  return [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) =>
      element.getAttribute('aria-hidden') !== 'true' &&
      element.closest('[hidden]') === null &&
      element.tabIndex !== -1,
  )
}

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  /** Hide the default close button when the dialog must be answered explicitly. */
  dismissible?: boolean
  labelledBy?: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES: Record<NonNullable<DialogProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

/**
 * Accessible modal dialog.
 *
 * Handles the full focus contract: focus moves into the dialog on open, Tab is
 * trapped inside it, Escape closes it when dismissible, and focus returns to the
 * trigger element on close.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  dismissible = true,
  size = 'md',
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()
  const reducedMotion = useSettingsStore((state) => state.reducedMotion)

  useEffect(() => {
    if (!open) return

    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const panel = panelRef.current
    // Focus the dialog container itself (not the first control) so assistive
    // technology announces the title before the user starts tabbing.
    if (panel) panel.focus({ preventScroll: true })

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
      returnFocusRef.current?.focus?.({ preventScroll: true })
    }
  }, [open])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape' && dismissible) {
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return

      const focusable = getFocusable(panel)

      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [dismissible, onClose],
  )

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-deep/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
            onClick={dismissible ? onClose : undefined}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`tw-panel relative z-10 w-full ${SIZE_CLASSES[size]} max-h-[85vh] overflow-y-auto tw-scroll rounded-b-none sm:rounded-b-[var(--radius-panel)]`}
          >
            <header className="flex items-start justify-between gap-4 border-b border-forest/15 px-5 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-bold text-deep sm:text-xl">
                  {title}
                </h2>
                {description ? (
                  <p id={descriptionId} className="mt-1 text-sm text-muted">
                    {description}
                  </p>
                ) : null}
              </div>
              {dismissible ? (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={`Close ${title}`}
                  className="shrink-0 rounded-full p-2 text-muted transition hover:bg-forest/10 hover:text-deep active:scale-95"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              ) : null}
            </header>
            <div className="px-5 py-4">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
