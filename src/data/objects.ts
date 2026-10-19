import type { WorldObjectDef } from '@/types'
import { LANDMARK_POSITIONS } from '@/data/world'

/**
 * Every discoverable / interactable object on Greenhaven Island.
 *
 * Adding a landmark to TinyWorld:
 *  1. Add an entry here with a stable, unique `id`.
 *  2. Place the matching visual in `src/world/objects/` and register it in
 *     `src/world/objects/ObjectVisual.tsx` under the `visual` key.
 *  3. If it should block movement, add it to `OBSTACLES` in `src/data/world.ts`.
 *
 * No other file needs to change — the scene, journal, directory, interaction
 * prompt and progress tracking all read from this array.
 */
export const WORLD_OBJECTS: readonly WorldObjectDef[] = [
  {
    id: 'lighthouse',
    name: 'Northwind Lighthouse',
    category: 'landmark',
    summary: 'A striped tower that has guided Greenhaven sailors for a century.',
    description:
      'The Northwind Lighthouse was rebuilt in stone after the great storm of 1911. Its lamp still turns every night, though most ships around Greenhaven now navigate by charts alone. Locals swear the light remembers the names of everyone it has carried home.',
    position: { ...LANDMARK_POSITIONS.lighthouse, y: 0 },
    radius: 4,
    discoverable: true,
    interactable: true,
    actionLabel: 'Climb the spiral stair',
    visual: 'lighthouse',
    lore: 'Forty-seven steps. Count them if you have time.',
  },
  {
    id: 'cottage',
    name: 'Fernhollow Cottage',
    category: 'structure',
    summary: 'A moss-roofed cottage with a chimney that never quite goes cold.',
    description:
      'Fernhollow Cottage belongs to whoever tends the island garden next. A pot of soup is usually on the stove, and the window box is replanted every spring by visiting travellers who leave their names in the guest book.',
    position: { ...LANDMARK_POSITIONS.cottage, y: 0 },
    radius: 4,
    discoverable: true,
    interactable: true,
    actionLabel: 'Knock on the door',
    visual: 'cottage',
    lore: 'The guest book has nine names. Four of them are yours.',
  },
  {
    id: 'windmill',
    name: 'The Old Windmill',
    category: 'landmark',
    summary: 'Sails that turn with the coastal wind, grinding nothing but good luck.',
    description:
      'The windmill outlasted the farm it served. Islanders still stop it during storms, not for the grain, but because it is said the sails count the days until the harbour opens again.',
    position: { ...LANDMARK_POSITIONS.windmill, y: 0 },
    radius: 3.5,
    discoverable: true,
    interactable: true,
    actionLabel: 'Turn the sails',
    visual: 'windmill',
  },
  {
    id: 'dock',
    name: 'Sunkenroot Dock',
    category: 'structure',
    summary: 'Weathered planks reaching into the green water.',
    description:
      'Sunkenroot Dock stretches further than it should and always creaks in the same three places. The crates stacked at its end are not cargo — they hold the supplies the island trades between its own coves.',
    position: { ...LANDMARK_POSITIONS.dock, y: 0 },
    radius: 3.5,
    discoverable: true,
    interactable: true,
    actionLabel: 'Look over the water',
    visual: 'dock',
  },
  {
    id: 'boardwalk',
    name: 'The Island Boardwalk',
    category: 'landmark-feature',
    summary: 'A hand-painted signpost listing everywhere worth walking to.',
    description:
      "The boardwalk sign has been repainted so many times the letters sit in slightly different layers. Following it is the intended way to see Greenhaven: lighthouse, cottage, mill, and finally the arch at the island's spine.",
    position: { ...LANDMARK_POSITIONS.boardwalk, y: 0 },
    radius: 2.2,
    discoverable: true,
    interactable: true,
    actionLabel: 'Read the signpost',
    visual: 'signpost',
    lore: 'Coast path: 3.2 km · Difficulty: gentle · Bring a jumper.',
  },
  {
    id: 'watchtower',
    name: 'Mossgrave Watchtower',
    category: 'landmark',
    summary: 'A stone tower where someone is always standing watch.',
    description:
      'The watchtower predates the lighthouse. Its keeper retired decades ago, but a lantern is still lit on the top step. Nobody on Greenhaven admits to lighting it, and nobody switches it off.',
    position: { ...LANDMARK_POSITIONS.watchtower, y: 0 },
    radius: 3,
    discoverable: true,
    interactable: true,
    actionLabel: 'Light the lantern',
    visual: 'watchtower',
  },
  {
    id: 'garden',
    name: 'The Tended Garden',
    category: 'nature',
    summary: 'Rows of vegetables behind a fence that is far too well kept.',
    description:
      'Every bed is labelled in handwriting that changes from season to season. The garden feeds the cottage, and the cottage feeds whoever walks the coast path — a quiet loop that keeps the island fed.',
    position: { ...LANDMARK_POSITIONS.garden, y: 0 },
    radius: 4,
    discoverable: true,
    interactable: true,
    actionLabel: 'Water the seedlings',
    visual: 'garden',
  },
  {
    id: 'camp',
    name: 'Emberfern Camp',
    category: 'structure',
    summary: 'A canvas tent and a fire ring under the pines.',
    description:
      'Emberfern Camp is maintained by nobody in particular. A pot always hangs over the fire, the firewood is always stacked, and a folded blanket waits on the log seat for whoever arrives last.',
    position: { ...LANDMARK_POSITIONS.camp, y: 0 },
    radius: 3,
    discoverable: true,
    interactable: true,
    actionLabel: 'Stoke the campfire',
    visual: 'camp',
  },
  {
    id: 'arch',
    name: 'The Greenhaven Arch',
    category: 'landmark',
    summary: "A natural stone arch worn through the island's spine.",
    description:
      'The arch has stood since before the island had a name. On the shortest day of the year the setting sun passes exactly through the opening, which the islanders treat as a good omen and an excellent photograph.',
    position: { ...LANDMARK_POSITIONS.arch, y: 0 },
    radius: 3,
    discoverable: true,
    interactable: true,
    actionLabel: 'Look through the arch',
    visual: 'arch',
    lore: 'Best light: 40 minutes before sunset.',
  },
  {
    id: 'spring',
    name: 'Coldwater Spring',
    category: 'nature',
    summary: 'A clear pool fed from somewhere under the hills.',
    description:
      'The spring runs cold enough to ache. Travellers leave a pebble on the flat stone beside it; there are thousands now, arranged by nobody into something that looks, from above, like a map of the island.',
    position: { ...LANDMARK_POSITIONS.spring, y: 0 },
    radius: 3,
    discoverable: true,
    interactable: true,
    actionLabel: 'Drink from the spring',
    visual: 'spring',
  },
]

const OBJECT_IDS = new Set(WORLD_OBJECTS.map((object) => object.id))

/** Total number of discoverable objects — the denominator for progress. */
export const TOTAL_DISCOVERABLE = WORLD_OBJECTS.filter((object) => object.discoverable).length

/** Every known object ID. Used to validate persisted discovery data. */
export const KNOWN_OBJECT_IDS: ReadonlySet<string> = OBJECT_IDS

const OBJECT_MAP = new Map(WORLD_OBJECTS.map((object) => [object.id, object]))

/** Look up a single object definition. Returns undefined for unknown IDs. */
export function getObjectById(id: string): WorldObjectDef | undefined {
  return OBJECT_MAP.get(id)
}

/** Category label used in the journal and detail panel. */
export const CATEGORY_LABELS: Record<WorldObjectDef['category'], string> = {
  landmark: 'Landmark',
  structure: 'Structure',
  nature: 'Nature',
  'landmark-feature': 'Wayfinding',
  character: 'Character',
  collectible: 'Collectible',
}
