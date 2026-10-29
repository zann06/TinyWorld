import { useState } from 'react'
import { motion } from 'motion/react'

export interface TravelFadeProps {
  islandId: string
  reducedMotion: boolean
}

/**
 * A soft cover that wipes the screen on island travel.
 *
 * Islands stay mounted, so a trip is an instant visibility swap — instant is
 * technically ideal but reads as a glitch. This paints a calm solid frame for
 * a moment whenever the island id changes, then fades it away. The very first
 * mount does not flash: the cover only appears from the second island on.
 *
 * Detecting "the prop just changed" follows the React-documented pattern of
 * keeping the previous value in state and adjusting during render.
 */
export function TravelFade({ islandId, reducedMotion }: TravelFadeProps) {
  const [previousIslandId, setPreviousIslandId] = useState(islandId)
  const [travelCount, setTravelCount] = useState(0)

  if (previousIslandId !== islandId) {
    setPreviousIslandId(islandId)
    setTravelCount((count) => count + 1)
  }

  if (travelCount === 0) return null

  return (
    <motion.div
      key={travelCount}
      aria-hidden="true"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.05 : 0.55, ease: 'easeOut' }}
      className="pointer-events-none absolute inset-0 z-40 bg-deep"
    />
  )
}
