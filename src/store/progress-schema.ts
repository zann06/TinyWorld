import type { DiscoveryEntry } from '@/types'

/**
 * Persisted discovery progress.
 *
 * Version 2 keys discoveries by island. Version 1 predates the second island and
 * stored one flat list; those entries all belong to the default island, so the
 * migration is a straight re-bucket rather than data loss.
 */
export interface StoredProgress {
  version: 2
  islands: Record<string, DiscoveryEntry[]>
}

export const PROGRESS_VERSION = 2 as const

export const EMPTY_PROGRESS: StoredProgress = {
  version: PROGRESS_VERSION,
  islands: {},
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Clean one island's entry list: drop unknown ids, drop duplicates, and keep
 * discovery order.
 */
function cleanEntries(raw: unknown, isKnown: (id: string) => boolean): DiscoveryEntry[] {
  if (!Array.isArray(raw)) return []

  const seen = new Set<string>()
  const discoveries: DiscoveryEntry[] = []

  for (const entry of raw) {
    if (!isRecord(entry)) continue
    const id = entry['id']
    const discoveredAt = entry['discoveredAt']

    if (typeof id !== 'string' || !isKnown(id) || seen.has(id)) continue
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
  return discoveries
}

/**
 * Validate persisted discovery data.
 *
 * Unknown object IDs are dropped — the world may gain or lose landmarks between
 * releases and a stale save must never break the journal. `islandOf` maps an
 * object id to the island that owns it, returning null for unknown ids.
 */
export function normaliseProgress(
  input: unknown,
  islandOf: (objectId: string) => string | null,
): StoredProgress {
  if (!isRecord(input)) return { ...EMPTY_PROGRESS, islands: {} }

  // Version 1: a single flat list predating the second island. Each entry is
  // bucketed by the island that owns it, which for real saves is always the
  // default island — but grouping rather than assuming means a save written by
  // a later build can never collapse two islands into one bucket.
  if (input['version'] !== PROGRESS_VERSION) {
    const entries = cleanEntries(input['discoveries'], (id) => islandOf(id) !== null)

    const islands: Record<string, DiscoveryEntry[]> = {}
    for (const entry of entries) {
      const owner = islandOf(entry.id)
      if (!owner) continue
      const bucket = islands[owner]
      if (bucket) bucket.push(entry)
      else islands[owner] = [entry]
    }

    return { version: PROGRESS_VERSION, islands }
  }

  const raw = input['islands']
  if (!isRecord(raw)) return { ...EMPTY_PROGRESS, islands: {} }

  const islands: Record<string, DiscoveryEntry[]> = {}

  for (const [islandId, entries] of Object.entries(raw)) {
    const cleaned = cleanEntries(entries, (id) => islandOf(id) === islandId)
    if (cleaned.length > 0) islands[islandId] = cleaned
  }

  return { version: PROGRESS_VERSION, islands }
}
