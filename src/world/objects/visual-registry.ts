import {
  Arch,
  Boathouse,
  Cairn,
  Camp,
  Cottage,
  Dock,
  Garden,
  Hearth,
  Lighthouse,
  RecordWall,
  RelicShard,
  RelicShell,
  RelicTotem,
  Signpost,
  Spring,
  TideBell,
  Watchtower,
  Windmill,
  Wreck,
} from '@/world/objects/ObjectVisual'
import type { WorldObjectDef } from '@/types'

/**
 * Typed lookup from a `WorldObjectDef['visual']` key to its renderer.
 *
 * Kept in its own module so `ObjectVisual.tsx` exports only components, which
 * keeps React Fast Refresh working during development.
 */
export const OBJECT_VISUALS = {
  lighthouse: Lighthouse,
  cottage: Cottage,
  windmill: Windmill,
  dock: Dock,
  signpost: Signpost,
  watchtower: Watchtower,
  garden: Garden,
  camp: Camp,
  arch: Arch,
  spring: Spring,
  wreck: Wreck,
  cairn: Cairn,
  boathouse: Boathouse,
  hearth: Hearth,
  'record-wall': RecordWall,
  'tide-bell': TideBell,
  shell: RelicShell,
  shard: RelicShard,
  totem: RelicTotem,
} as const satisfies Record<string, () => React.JSX.Element>

export type VisualKey = keyof typeof OBJECT_VISUALS

export function isKnownVisual(visual: string): visual is VisualKey {
  return Object.prototype.hasOwnProperty.call(OBJECT_VISUALS, visual)
}

/**
 * Compile-time-ish guard: every declared object must have a registered visual.
 * Called from the unit tests so a new landmark can never ship without a model.
 */
export function findObjectsWithoutVisual(objects: readonly WorldObjectDef[]): string[] {
  return objects.filter((object) => !isKnownVisual(object.visual)).map((object) => object.id)
}
