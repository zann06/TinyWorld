import { KNOWN_OBJECT_IDS } from '@/data/objects'
import type { DiscoveryEntry } from '@/types'

/**
 * Discovery rules — pure functions so they can be unit tested without React
 * or the 3D scene.
 */

/** Progress as a 0–1 ratio, plus the raw counts for UI display. */
export interface ProgressSummary {
  found: number
  total: number
  ratio: number
}

export function summariseProgress(
  discoveries: readonly DiscoveryEntry[],
  total: number,
): ProgressSummary {
  const found = discoveries.filter((entry) => KNOWN_OBJECT_IDS.has(entry.id)).length
  const safeTotal = Math.max(total, 0)
  return {
    found,
    total: safeTotal,
    ratio: safeTotal === 0 ? 0 : Math.min(1, found / safeTotal),
  }
}

/**
 * Record a discovery.
 * Returns the existing array unchanged when the object is already known, so
 * progress can never be inflated by repeated interactions.
 */
export function addDiscovery(
  discoveries: readonly DiscoveryEntry[],
  id: string,
  now: number = Date.now(),
): { discoveries: DiscoveryEntry[]; isNew: boolean } {
  if (!KNOWN_OBJECT_IDS.has(id))
    return { discoveries: discoveries as DiscoveryEntry[], isNew: false }
  if (discoveries.some((entry) => entry.id === id)) {
    return { discoveries: discoveries as DiscoveryEntry[], isNew: false }
  }

  return {
    discoveries: [...discoveries, { id, discoveredAt: now }],
    isNew: true,
  }
}

export function hasDiscovered(discoveries: readonly DiscoveryEntry[], id: string): boolean {
  return discoveries.some((entry) => entry.id === id)
}

export function discoveredIds(discoveries: readonly DiscoveryEntry[]): Set<string> {
  return new Set(discoveries.map((entry) => entry.id))
}

/** Reset helper — returns a brand new empty array. */
export function clearDiscoveries(): DiscoveryEntry[] {
  return []
}
