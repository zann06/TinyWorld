import type { DiscoveryEntry } from '@/types'

export interface StoredProgress {
  version: 1
  discoveries: DiscoveryEntry[]
}

export const PROGRESS_VERSION = 1 as const

export const EMPTY_PROGRESS: StoredProgress = {
  version: PROGRESS_VERSION,
  discoveries: [],
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Validate persisted discovery data.
 * Unknown object IDs are dropped — the world may gain or lose landmarks
 * between releases and a stale save must never break the journal.
 */
export function normaliseProgress(input: unknown, knownIds: ReadonlySet<string>): StoredProgress {
  if (!isRecord(input)) return { ...EMPTY_PROGRESS }

  const raw = input['discoveries']
  if (!Array.isArray(raw)) return { ...EMPTY_PROGRESS }

  const seen = new Set<string>()
  const discoveries: DiscoveryEntry[] = []

  for (const entry of raw) {
    if (!isRecord(entry)) continue
    const id = entry['id']
    const discoveredAt = entry['discoveredAt']

    if (typeof id !== 'string' || !knownIds.has(id) || seen.has(id)) continue
    seen.add(id)

    discoveries.push({
      id,
      discoveredAt:
        typeof discoveredAt === 'number' && Number.isFinite(discoveredAt) && discoveredAt > 0
          ? discoveredAt
          : Date.now(),
    })
  }

  discoveries.sort((a, b) => a.discoveredAt - b.discoveredAt)
  return { version: PROGRESS_VERSION, discoveries }
}
