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
  discoveries: DiscoveryEntry[]
  /** Id of the last discovered object, used to drive the celebration animation. */
  lastDiscoveredId: string | null
  /** Explicit UI-only browsing mode, no avatar movement. */
  uiFirstMode: boolean
}
