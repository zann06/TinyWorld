import type { IslandDefinition, WorldObjectDef } from '@/types'
import { ISLANDS, allObjectIds } from '@/data/islands'

/**
 * Object lookups, scoped to an island.
 *
 * Every function takes the island explicitly rather than reaching for a global
 * "current island", so a lookup can never return a landmark from somewhere the
 * explorer is not standing.
 */

/** Every object on an island. */
export function islandObjects(island: IslandDefinition): readonly WorldObjectDef[] {
  return island.objects
}

/** Discoverable object ids on an island. Used to validate persisted progress. */
export function islandObjectIds(island: IslandDefinition): ReadonlySet<string> {
  return new Set(island.objects.map((object) => object.id))
}

/** Every object id on every island, for validating a whole save file. */
export const KNOWN_OBJECT_IDS: ReadonlySet<string> = allObjectIds()

const OBJECT_MAPS = new Map<string, Map<string, WorldObjectDef>>(
  ISLANDS.map((island) => [
    island.id,
    new Map(island.objects.map((object) => [object.id, object])),
  ]),
)

/** Look up one object on one island. Returns undefined for unknown IDs. */
export function getObjectById(island: IslandDefinition, id: string): WorldObjectDef | undefined {
  return OBJECT_MAPS.get(island.id)?.get(id)
}

/** True when the id names a real object on this island. */
export function hasObject(island: IslandDefinition, id: string): boolean {
  return OBJECT_MAPS.get(island.id)?.has(id) === true
}

/** How many landmarks on an island count toward progress. */
export function islandDiscoverableCount(island: IslandDefinition): number {
  return island.objects.filter((object) => object.discoverable).length
}

/** Category label used in the journal, the directory and the detail panel. */
export const CATEGORY_LABELS: Record<WorldObjectDef['category'], string> = {
  landmark: 'Landmark',
  structure: 'Structure',
  nature: 'Nature',
  'landmark-feature': 'Wayfinding',
  character: 'Character',
  collectible: 'Collectible',
}
