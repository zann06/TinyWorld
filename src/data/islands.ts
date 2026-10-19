import type { IslandDefinition } from '@/types'
import { GREENHAVEN_OBJECTS } from '@/data/islands/greenhaven-objects'
import { CAIRNMOOR_OBJECTS } from '@/data/islands/cairnmoor-objects'

/**
 * Every island in TinyWorld.
 *
 * Each entry is entirely self-contained: coastline, height field, palette,
 * footpath, obstacles, decorative scatter and the landmarks themselves. Nothing
 * outside this file branches on which island is active, so adding a third island
 * means adding a third entry and registering its visuals.
 *
 * Numbers for Greenhaven were tuned by eye against the rendered result and are
 * reproduced here exactly; do not "tidy" them.
 */

export const GREENHAVEN: IslandDefinition = {
  id: 'greenhaven',
  name: 'Greenhaven Island',
  tagline: 'A little world, waiting to be explored.',
  blurb: 'Ten landmarks, a coast path and a lighthouse that still turns at night.',

  radius: 46,
  terrainHeight: 9.5,
  spawn: { x: -26, z: 22 },
  defaultYaw: 0.6,
  seed: 20_240_617,

  coast: {
    harmonics: [
      { amplitude: 0.14, frequency: 2, phase: 0.9 },
      { amplitude: 0.09, frequency: 3, phase: -0.4 },
      { amplitude: 0.05, frequency: 5, phase: 2.1 },
      { amplitude: 0.03, frequency: 8, phase: -1.1 },
    ],
    bay: { angle: 0.35, width: 0.5, depth: 0.1 },
  },

  shape: {
    hills: 4.6,
    detail: 1.35,
    spine: { amplitude: 3.6, offsetZ: -4, spread: 11 },
    knoll: { amplitude: 4.2, centreX: -20, centreZ: -14, spreadX: 12, spreadZ: 10 },
    shoreDepth: 2.6,
  },

  palette: {
    grassHigh: '#8fc268',
    grassLow: '#5d9c4c',
    meadow: '#b3d089',
    sand: '#ecd9a6',
    shore: '#d6bb8c',
    rock: '#9a9d90',
    water: '#4e9a91',
    waterShallow: '#7cc3b4',
  },

  path: [
    { x: -30, z: 26 },
    { x: -20, z: 16 },
    { x: -12, z: 8 },
    { x: -6, z: 0 },
    { x: -2, z: -8 },
    { x: 4, z: -16 },
    { x: 12, z: -22 },
    { x: 22, z: -24 },
    { x: 30, z: -18 },
  ],

  obstacles: [
    { id: 'lighthouse', x: 30, z: -18, radius: 3.2 },
    { id: 'cottage', x: -12, z: 8, radius: 3.6 },
    { id: 'windmill', x: 12, z: -22, radius: 2.8 },
    { id: 'watchtower', x: -2, z: -8, radius: 2.6 },
    { id: 'dock-pier', x: -30, z: 26, radius: 3.0 },
    { id: 'garden-fence', x: 22, z: -24, radius: 4.2 },
    { id: 'camp-tent', x: -22, z: -14, radius: 2.4 },
    { id: 'arch-stone', x: 4, z: -16, radius: 1.8 },
    { id: 'boardwalk-sign', x: -20, z: 16, radius: 1.4 },
    { id: 'spring-pool', x: 10, z: 10, radius: 2.4 },
    { id: 'camp-campfire', x: -22, z: -14, radius: 1.6 },
  ],

  scatter: {
    tree: [
      { x: -34, z: -2, count: 16, radius: 10 },
      { x: -30, z: 20, count: 12, radius: 9 },
      { x: -18, z: -26, count: 16, radius: 11 },
      { x: -8, z: -32, count: 12, radius: 9 },
      { x: 6, z: 30, count: 14, radius: 10 },
      { x: 20, z: 30, count: 12, radius: 9 },
      { x: 30, z: 12, count: 15, radius: 10 },
      { x: 34, z: -8, count: 12, radius: 9 },
      { x: 34, z: -30, count: 12, radius: 9 },
      { x: 20, z: -6, count: 10, radius: 8 },
      { x: -6, z: -14, count: 10, radius: 8 },
      { x: -32, z: -22, count: 10, radius: 8 },
      { x: 4, z: 18, count: 10, radius: 8 },
      { x: -14, z: 24, count: 10, radius: 8 },
      { x: 26, z: -18, count: 10, radius: 8 },
    ],
    rock: [
      { x: -26, z: 30, count: 8, radius: 5 },
      { x: 20, z: 18, count: 7, radius: 5 },
      { x: -16, z: -20, count: 6, radius: 4 },
      { x: 38, z: -6, count: 6, radius: 5 },
      { x: -4, z: 34, count: 6, radius: 5 },
      { x: 34, z: 24, count: 6, radius: 5 },
    ],
    flower: [
      { x: -6, z: 14, count: 22, radius: 5 },
      { x: 18, z: 4, count: 18, radius: 5 },
      { x: -24, z: 4, count: 20, radius: 6 },
      { x: 26, z: -30, count: 16, radius: 5 },
      { x: 0, z: -24, count: 14, radius: 5 },
      { x: -30, z: 12, count: 16, radius: 5 },
      { x: 14, z: 22, count: 16, radius: 5 },
      { x: -12, z: -30, count: 14, radius: 5 },
      { x: 30, z: -22, count: 14, radius: 5 },
    ],
  },

  objects: GREENHAVEN_OBJECTS,
}

/**
 * Cairnmoor Isle — the second island.
 *
 * Deliberately the opposite of Greenhaven: smaller, higher, greyer and colder,
 * with a bay on the western shore instead of the eastern one and far fewer
 * trees. The landmarks are things the sea left behind rather than things people
 * built to stay.
 */
export const CAIRNMOOR: IslandDefinition = {
  id: 'cairnmoor',
  name: 'Cairnmoor Isle',
  tagline: 'Everything the sea left behind, and someone kept counting.',
  blurb: 'A beached wreck, a stone cairn and a boathouse that no longer launches.',

  radius: 38,
  terrainHeight: 13,
  spawn: { x: -21, z: 11 },
  defaultYaw: -0.55,
  seed: 881_145,

  coast: {
    harmonics: [
      { amplitude: 0.17, frequency: 2, phase: -1.4 },
      { amplitude: 0.11, frequency: 3, phase: 0.7 },
      { amplitude: 0.07, frequency: 4, phase: 2.6 },
      { amplitude: 0.04, frequency: 7, phase: -0.3 },
    ],
    // The inlet cuts into the western shore, opposite Greenhaven's.
    bay: { angle: Math.PI - 0.4, width: 0.42, depth: 0.13 },
  },

  shape: {
    hills: 5.4,
    detail: 1.8,
    spine: { amplitude: 5.2, offsetZ: 6, spread: 8.5 },
    knoll: { amplitude: 4.6, centreX: 14, centreZ: -14, spreadX: 10, spreadZ: 12 },
    shoreDepth: 3.4,
  },

  palette: {
    grassHigh: '#7ba463',
    grassLow: '#4e7a4b',
    meadow: '#a3bd7c',
    sand: '#dbd0ad',
    shore: '#b8ad91',
    rock: '#8c8b85',
    water: '#3f7f92',
    waterShallow: '#6fb0b4',
  },

  path: [
    { x: -19, z: -13 },
    { x: -20, z: -3 },
    { x: -15, z: 6 },
    { x: -2, z: 16 },
    { x: 8, z: 14 },
    { x: 16, z: 13 },
    { x: 24, z: 3 },
    { x: 24, z: -8 },
  ],

  obstacles: [
    { id: 'wreck-hull', x: -6, z: 24, radius: 4.0 },
    { id: 'cairn-stone', x: 16, z: 14, radius: 2.2 },
    { id: 'boathouse', x: -22, z: 6, radius: 3.0 },
    { id: 'jetty-pier', x: -19, z: -13, radius: 2.6 },
    { id: 'split-stone', x: 8, z: -8, radius: 1.8 },
    { id: 'drift-camp-tent', x: -14, z: -20, radius: 2.4 },
    { id: 'seep-pool', x: 24, z: -8, radius: 2.2 },
    { id: 'way-marker', x: -2, z: 16, radius: 1.4 },
    { id: 'drift-camp-fire', x: -14, z: -20, radius: 1.6 },
  ],

  scatter: {
    // Wind-bent and sparse: this island is mostly stone.
    tree: [
      { x: -28, z: 4, count: 8, radius: 8 },
      { x: -10, z: -26, count: 7, radius: 8 },
      { x: 26, z: 16, count: 6, radius: 7 },
      { x: 10, z: 24, count: 7, radius: 8 },
      { x: 30, z: -12, count: 5, radius: 7 },
    ],
    rock: [
      { x: 0, z: -24, count: 9, radius: 6 },
      { x: -24, z: -24, count: 7, radius: 6 },
      { x: 22, z: -22, count: 7, radius: 6 },
      { x: 28, z: 8, count: 8, radius: 6 },
      { x: -30, z: 22, count: 7, radius: 6 },
      { x: 4, z: 28, count: 6, radius: 5 },
      { x: -6, z: -8, count: 7, radius: 7 },
    ],
    flower: [
      { x: -10, z: 4, count: 12, radius: 5 },
      { x: 12, z: 2, count: 10, radius: 5 },
      { x: -18, z: -12, count: 9, radius: 4 },
      { x: 18, z: -4, count: 11, radius: 5 },
      { x: 2, z: 18, count: 8, radius: 4 },
    ],
  },

  objects: CAIRNMOOR_OBJECTS,
}

/** Every island, in switcher order. Greenhaven is always first. */
export const ISLANDS: readonly IslandDefinition[] = [GREENHAVEN, CAIRNMOOR]

export const DEFAULT_ISLAND_ID = GREENHAVEN.id

const ISLAND_MAP = new Map(ISLANDS.map((island) => [island.id, island]))

/** Look up an island. Falls back to the default so a stale id can never crash. */
export function getIsland(id: string | null | undefined): IslandDefinition {
  if (!id) return GREENHAVEN
  return ISLAND_MAP.get(id) ?? GREENHAVEN
}

/** True when the id names a real island. */
export function isKnownIsland(id: unknown): id is string {
  return typeof id === 'string' && ISLAND_MAP.has(id)
}

/** Every object id on every island, used to validate persisted progress. */
export function allObjectIds(): ReadonlySet<string> {
  const ids = new Set<string>()
  for (const island of ISLANDS) {
    for (const object of island.objects) ids.add(object.id)
  }
  return ids
}

/** Total landmarks across every island — the denominator for world progress. */
export const TOTAL_DISCOVERABLE = ISLANDS.reduce(
  (total, island) => total + island.objects.filter((object) => object.discoverable).length,
  0,
)

const OBJECT_OWNER = new Map<string, string>()
for (const island of ISLANDS) {
  for (const object of island.objects) OBJECT_OWNER.set(object.id, island.id)
}

/**
 * Which island owns an object id, or null when the id is unknown.
 * Used to bucket persisted discoveries on load.
 */
export function islandOfObjectId(objectId: string): string | null {
  return OBJECT_OWNER.get(objectId) ?? null
}
