/**
 * Ambient life configuration.
 *
 * NPCs and boats are decorative: they never enter collision, discovery or the
 * interaction system. Keeping their data separate from landmarks means a new
 * island can gain life without changing the gameplay data model.
 */

export type NpcStyle = 'hat' | 'hood' | 'apron'

export interface AmbientNpcDef {
  id: string
  name: string
  role: string
  /** Centre of the stroll, in island-local world coordinates. */
  anchor: { x: number; z: number }
  /** Half-width of the lazy figure-eight the NPC walks. */
  wander: { x: number; z: number }
  /** Radians per second around the wander path. */
  speed: number
  phase: number
  scale: number
  style: NpcStyle
  shirt: string
  pants: string
  skin: string
  hair: string
  accent: string
}

export interface AmbientBoatDef {
  id: string
  name: string
  /** Starting angle around the island, in radians. */
  angle: number
  /** Orbit speed in radians per second. Negative values sail the other way. */
  speed: number
  orbitFactor: number
  orbitOffset: number
  phase: number
  scale: number
  hull: string
  sail: string
  trim: string
}

export interface AmbientIsland {
  npcs: readonly AmbientNpcDef[]
  boats: readonly AmbientBoatDef[]
}

const GREENHAVEN_AMBIENT: AmbientIsland = {
  npcs: [
    {
      id: 'mara',
      name: 'Mara',
      role: 'Cottage keeper',
      anchor: { x: -9, z: 6.5 },
      wander: { x: 3, z: 1.8 },
      speed: 0.22,
      phase: 0.4,
      scale: 1,
      style: 'apron',
      shirt: '#a8452f',
      pants: '#386641',
      skin: '#e8b98a',
      hair: '#4a3728',
      accent: '#e6d3ae',
    },
    {
      id: 'tomas',
      name: 'Tomas',
      role: 'Dockhand',
      anchor: { x: -25, z: 23 },
      wander: { x: 2.8, z: 2.2 },
      speed: 0.18,
      phase: 2.2,
      scale: 1.04,
      style: 'hat',
      shirt: '#4f7f9a',
      pants: '#5a4a3a',
      skin: '#c98f64',
      hair: '#33261d',
      accent: '#d9c08a',
    },
    {
      id: 'iris',
      name: 'Iris',
      role: 'Gardener',
      anchor: { x: 18.5, z: -19.5 },
      wander: { x: 2.4, z: 2.6 },
      speed: 0.24,
      phase: 4.1,
      scale: 0.94,
      style: 'hat',
      shirt: '#7f9a5a',
      pants: '#6b4a2f',
      skin: '#d8a57a',
      hair: '#6b4a2f',
      accent: '#e6d3ae',
    },
  ],
  boats: [
    {
      id: 'sunrise',
      name: 'Sunrise',
      angle: 0.8,
      speed: 0.026,
      orbitFactor: 1.2,
      orbitOffset: 2.5,
      phase: 0.5,
      scale: 1,
      hull: '#8a5a33',
      sail: '#f2e8cf',
      trim: '#a8452f',
    },
    {
      id: 'petrel',
      name: 'Petrel',
      angle: 3.7,
      speed: -0.019,
      orbitFactor: 1.24,
      orbitOffset: 4,
      phase: 2.7,
      scale: 0.88,
      hull: '#4f7f9a',
      sail: '#e9ddbd',
      trim: '#386641',
    },
  ],
}

const CAIRNMOOR_AMBIENT: AmbientIsland = {
  npcs: [
    {
      id: 'ewan',
      name: 'Ewan',
      role: 'Boathouse keeper',
      anchor: { x: -17, z: 8.5 },
      wander: { x: 2.4, z: 1.8 },
      speed: 0.17,
      phase: 1.1,
      scale: 1.02,
      style: 'hood',
      shirt: '#c2a874',
      pants: '#3f4a44',
      skin: '#d8a57a',
      hair: '#5a3d27',
      accent: '#7a5f45',
    },
    {
      id: 'nessa',
      name: 'Nessa',
      role: 'Cairn watcher',
      anchor: { x: 12, z: 10.5 },
      wander: { x: 2.8, z: 2.4 },
      speed: 0.2,
      phase: 3.4,
      scale: 0.97,
      style: 'hood',
      shirt: '#6d5a7a',
      pants: '#4a382b',
      skin: '#e0b08a',
      hair: '#4a3728',
      accent: '#b9b3a4',
    },
  ],
  boats: [
    {
      id: 'gullrock',
      name: 'Gullrock',
      angle: 1.4,
      speed: 0.022,
      orbitFactor: 1.22,
      orbitOffset: 2.8,
      phase: 1.4,
      scale: 0.94,
      hull: '#5f4a38',
      sail: '#c2a874',
      trim: '#3f4a44',
    },
    {
      id: 'grey-wing',
      name: 'Grey Wing',
      angle: 4.5,
      speed: -0.016,
      orbitFactor: 1.26,
      orbitOffset: 3.6,
      phase: 4.2,
      scale: 0.82,
      hull: '#6d6a60',
      sail: '#e6d3ae',
      trim: '#8a4a35',
    },
  ],
}

const HEARTHFALL_AMBIENT: AmbientIsland = {
  npcs: [
    {
      id: 'keeper',
      name: 'The Keeper',
      role: 'Keeper of the hearth',
      anchor: { x: 18, z: -9.5 },
      wander: { x: 2.6, z: 2 },
      speed: 0.16,
      phase: 0.7,
      scale: 1.04,
      style: 'hood',
      shirt: '#8a4a35',
      pants: '#4a382b',
      skin: '#d8a57a',
      hair: '#5a3d27',
      accent: '#d9c08a',
    },
    {
      id: 'ash',
      name: 'Ash',
      role: 'Hearth tender',
      anchor: { x: 1, z: 3.5 },
      wander: { x: 2.2, z: 1.8 },
      speed: 0.22,
      phase: 2.8,
      scale: 0.92,
      style: 'apron',
      shirt: '#b08f63',
      pants: '#3f4a44',
      skin: '#e8b98a',
      hair: '#33261d',
      accent: '#f2cc8f',
    },
  ],
  boats: [
    {
      id: 'ashlight',
      name: 'Ashlight',
      angle: 2.2,
      speed: 0.024,
      orbitFactor: 1.22,
      orbitOffset: 3,
      phase: 3.1,
      scale: 0.96,
      hull: '#7a4b32',
      sail: '#d9c08a',
      trim: '#8a4a35',
    },
    {
      id: 'ember',
      name: 'Ember',
      angle: 5.2,
      speed: -0.018,
      orbitFactor: 1.27,
      orbitOffset: 2.4,
      phase: 0.9,
      scale: 0.86,
      hull: '#4a382b',
      sail: '#f2cc8f',
      trim: '#386641',
    },
  ],
}

const AMBIENT_BY_ISLAND: Readonly<Record<string, AmbientIsland>> = {
  greenhaven: GREENHAVEN_AMBIENT,
  cairnmoor: CAIRNMOOR_AMBIENT,
  hearthfall: HEARTHFALL_AMBIENT,
}

const EMPTY_AMBIENT: AmbientIsland = { npcs: [], boats: [] }

export function ambientFor(islandId: string): AmbientIsland {
  return AMBIENT_BY_ISLAND[islandId] ?? EMPTY_AMBIENT
}

export function allAmbientNpcs(): readonly AmbientNpcDef[] {
  return Object.values(AMBIENT_BY_ISLAND).flatMap((entry) => entry.npcs)
}

export function allAmbientBoats(): readonly AmbientBoatDef[] {
  return Object.values(AMBIENT_BY_ISLAND).flatMap((entry) => entry.boats)
}
