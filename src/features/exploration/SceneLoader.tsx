import { useEffect, useState } from 'react'
import { motion } from 'motion/react'

/**
 * Scene loading indicator.
 *
 * The world builds its geometry procedurally, so the "loading" work is real but
 * short. This component covers the gap between React mount and the first
 * rendered frame, and disappears on its own.
 */
export function SceneLoader() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 900)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <motion.div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-deep/70"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex flex-col items-center gap-3 text-cream">
        <span
          aria-hidden="true"
          className="size-10 animate-spin rounded-full border-[3px] border-cream/25 border-t-sun"
        />
        <p className="text-sm font-medium">Growing Greenhaven Island…</p>
      </div>
    </motion.div>
  )
}
