import type { QualityLevel } from '@/types'
import { ISLANDS, getIsland } from '@/data/islands'
import { TERRAIN_SEGMENTS, createTerrain } from '@/world/terrain/terrain'
import { getVegetationData } from '@/world/scenes/vegetation-data'

/**
 * Build the expensive per-island data ahead of time.
 *
 * Geometry and vegetation caches make this idempotent, so it is safe to call
 * for an island that is already warm. It runs on the main thread, which is why
 * it is only ever scheduled during idle time.
 */
export function prepareIsland(islandId: string, quality: QualityLevel): void {
  const island = getIsland(islandId)

  // `getIsland` falls back to Greenhaven for unknown ids; skip those.
  if (island.id !== islandId) return

  const terrain = createTerrain(island)
  terrain.buildGeometry(TERRAIN_SEGMENTS[quality])
  getVegetationData(island, terrain)
  // Path discs are built on demand by the scene; sampling them here keeps the
  // first frame after a trip free of extra height lookups.
  terrain.samplePath(island.path, 10)
}

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
    options?: { timeout: number },
  ) => number
  cancelIdleCallback?: (handle: number) => void
}

/** Give the active island and the first painted frames room to settle. */
const START_DELAY_MS = 1_500

/**
 * Warm every island except the active one, one island per idle slice.
 *
 * `onPrepared` lets the renderer mount that island's already-built scene while
 * the browser is still idle. Keeping it mounted afterwards is what removes the
 * rebuild cost from travel: switching islands becomes a visibility change.
 *
 * Returns a cancellation function for effect cleanup.
 */
export function scheduleIslandPreparation(
  activeIslandId: string,
  quality: QualityLevel,
  onPrepared?: (islandId: string) => void,
): () => void {
  const pending = ISLANDS.filter((island) => island.id !== activeIslandId)
  if (pending.length === 0) return () => undefined

  const view = window as IdleWindow
  let cancelled = false
  let index = 0
  let idleHandle: number | undefined

  const scheduleNext = (): void => {
    if (cancelled || index >= pending.length) return
    if (view.requestIdleCallback) {
      idleHandle = view.requestIdleCallback(run, { timeout: 4_000 })
    } else {
      idleHandle = window.setTimeout(run, 1_000)
    }
  }

  const run = (): void => {
    idleHandle = undefined
    if (cancelled) return

    const island = pending[index]
    index += 1
    if (!island) return

    prepareIsland(island.id, quality)
    onPrepared?.(island.id)
    scheduleNext()
  }

  const startTimer = window.setTimeout(scheduleNext, START_DELAY_MS)

  return () => {
    cancelled = true
    window.clearTimeout(startTimer)
    if (idleHandle === undefined) return
    if (view.cancelIdleCallback) view.cancelIdleCallback(idleHandle)
    else window.clearTimeout(idleHandle)
  }
}
