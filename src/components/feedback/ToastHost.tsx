import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { useGameStore } from '@/store/game-store'
import { useSettingsStore } from '@/store/settings-store'

const AUTO_DISMISS_MS = 5200

const VARIANTS = {
  success: { Icon: CheckCircle2, accent: 'text-leaf', ring: 'ring-leaf/40' },
  info: { Icon: Info, accent: 'text-forest', ring: 'ring-forest/30' },
  error: { Icon: TriangleAlert, accent: 'text-[#a8442a]', ring: 'ring-[#a8442a]/40' },
} as const

/**
 * Live region for transient notifications.
 * Uses `aria-live="polite"` so discoveries and setting changes are announced
 * without interrupting the user.
 */
export function ToastHost() {
  const toasts = useGameStore((state) => state.toasts)
  const dismissToast = useGameStore((state) => state.dismissToast)
  const reducedMotion = useSettingsStore((state) => state.reducedMotion)

  useEffect(() => {
    if (toasts.length === 0) return

    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismissToast(toast.id), AUTO_DISMISS_MS),
    )

    return () => {
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [toasts, dismissToast])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-4 sm:bottom-4 sm:right-4 sm:left-auto sm:items-end sm:px-0"
      role="region"
      aria-label="Notifications"
    >
      <div aria-live="polite" aria-atomic="false" className="contents">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const { Icon, accent, ring } = VARIANTS[toast.variant]
            return (
              <motion.div
                key={toast.id}
                layout={!reducedMotion}
                initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: reducedMotion ? 0 : 0.2 }}
                className={`tw-panel pointer-events-auto flex w-full max-w-sm items-start gap-3 px-4 py-3 ring-1 ${ring}`}
              >
                <Icon size={20} aria-hidden="true" className={`mt-0.5 shrink-0 ${accent}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-deep">{toast.title}</p>
                  <p className="mt-0.5 text-sm leading-snug text-muted">{toast.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label={`Dismiss notification: ${toast.title}`}
                  className="-mr-1 shrink-0 rounded-full p-1.5 text-muted transition hover:bg-forest/10 hover:text-deep"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>,
    document.body,
  )
}
