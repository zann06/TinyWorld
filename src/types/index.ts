/**
 * Core domain types shared by the world renderer, game systems and UI.
 */

export type ObjectCategory =
  'landmark' | 'structure' | 'nature' | 'landmark-feature' | 'character' | 'collectible'

export type QualityLevel = 'low' | 'medium' | 'high'

export type TimeOfDayPreset = 'day' | 'dusk' | 'night'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface Vec2 {
  x: number
  z: number
}

/** Radius-based circular obstacle used by the collision system. */
export interface Obstacle {
  id: string
  x: number
  z: number
  radius: number
}

/**
 * A world object definition. Declared once in `src/data/objects.ts` and consumed
 * by the 3D scene, the DOM directory, the journal and the interaction system.
 */
export interface WorldObjectDef {
  /** Stable identifier. Never rename without a migration. */
  id: string
  name: string
  category: ObjectCategory
  /** Short flavour line shown in listings. */
  summary: string
  /** Full text revealed once discovered. */
  description: string
  /** Position in world space (y is derived from terrain). */
  position: Vec3
  /** Radius used for proximity detection and selection highlighting. */
  radius: number
  /** Discovered objects count toward progress. */
  discoverable: boolean
  /** Interactable objects respond to the `E` key / action button. */
  interactable: boolean
  /** Short verb rendered on the interaction prompt, e.g. "Explore". */
  actionLabel?: string
  /** Which visual variant the renderer should build. */
  visual: string
  /** Blurb printed on the in-world information board, when present. */
  lore?: string
}

/** A discovered object as persisted to storage. */
export interface DiscoveryEntry {
  id: string
  discoveredAt: number
}

export interface PathPoint {
  x: number
  z: number
}

/** A circular scatter area used to place decorative props. */
export interface ScatterCluster {
  x: number
  z: number
  count: number
  radius: number
}

/** Which prop family a scatter cluster belongs to. */
export type ScatterKind = 'tree' | 'rock' | 'flower'

export interface IslandPalette {
  grassHigh: string
  grassLow: string
  meadow: string
  sand: string
  shore: string
  rock: string
  water: string
  waterShallow: string
}

/** One harmonic term of a coastline outline. */
export interface CoastHarmonic {
  amplitude: number
  frequency: number
  phase: number
}

/** The irregular outline of an island. */
export interface CoastShape {
  harmonics: readonly CoastHarmonic[]
  /** A sheltered inlet carved out of the shoreline. */
  bay: { angle: number; width: number; depth: number }
}

/** Parameters for the island's height field. */
export interface TerrainShape {
  /** Amplitude of the two rolling-hill octaves. */
  hills: number
  /** Amplitude of the fine detail octave. */
  detail: number
  /** A ridge running along the island's spine. */
  spine: { amplitude: number; offsetZ: number; spread: number }
  /** A secondary knoll, so the skyline has more than one silhouette. */
  knoll: {
    amplitude: number
    centreX: number
    centreZ: number
    spreadX: number
    spreadZ: number
  }
  /** How far the beach ramps down past the waterline. */
  shoreDepth: number
}

/**
 * A complete, self-contained island.
 *
 * Everything the renderer, the collision system and the UI need to show one
 * island lives here, so a new island is one entry in `ISLANDS` rather than a
 * branch threaded through the scene.
 */
export interface IslandDefinition {
  /** Stable identifier. Used as the storage key for per-island progress. */
  id: string
  name: string
  tagline: string
  /** One-line summary shown in the island switcher. */
  blurb: string
  /** Radius of the walkable island, in world units. */
  radius: number
  /** Height of the central plateau. */
  terrainHeight: number
  /** Where the explorer arrives. */
  spawn: Vec2
  /** Camera yaw restored with the session, when no session exists. */
  defaultYaw: number
  /** Seed for every deterministic scatter on this island. */
  seed: number
  coast: CoastShape
  shape: TerrainShape
  palette: IslandPalette
  /** The footpath linking the landmarks together. */
  path: readonly PathPoint[]
  /** Solid structures the explorer cannot walk through. */
  obstacles: readonly Obstacle[]
  /** Decorative placement, one entry per prop family. */
  scatter: Record<ScatterKind, readonly ScatterCluster[]>
  /** Every discoverable / interactable object on this island. */
  objects: readonly WorldObjectDef[]
}

export interface SettingsState {
  quality: QualityLevel
  cameraSensitivity: number
  masterVolume: number
  muted: boolean
  reducedMotion: boolean
  showHud: boolean
  invertLookY: boolean
  timeOfDay: TimeOfDayPreset
  autoCycleTime: boolean
}

export interface GameState {
  /** Object currently selected in the 3D scene or the DOM directory. */
  selectedId: string | null
  /** Object the player is standing close enough to interact with. */
  nearbyId: string | null
  /** Whether the detail panel is open. */
  panelOpen: boolean
  /** True while a blocking modal (settings/journal) owns focus. */
  modalOpen: boolean
  /** Free-look / pointer-lock exploration mode. */
  exploring: boolean
  photoMode: boolean
  onboardingComplete: boolean
  /** Which island the explorer is standing on. */
  activeIslandId: string
  /** Id of the last discovered object, used to drive the celebration animation. */
  lastDiscoveredId: string | null
  /** Explicit UI-only browsing mode, no avatar movement. */
  uiFirstMode: boolean
}
