import { getObjectById } from '@/data/objects'
import type { WorldObjectDef } from '@/types'

/**
 * Interaction dispatch.
 *
 * Every object resolves to a concrete, meaningful outcome. There are no
 * placeholder or no-op actions: interacting with an object always reveals
 * information, changes the world state, or both.
 */

export type InteractionKind = 'read' | 'discover' | 'read-board' | 'inspect'

export interface InteractionOutcome {
  id: string
  kind: InteractionKind
  /** Title shown on the confirmation toast. */
  title: string
  /** Body copy shown in the toast and as the object detail. */
  message: string
  /** When true, this interaction marks the object as discovered. */
  discovers: boolean
  /** Optional world-state effect key consumed by the scene. */
  effect?: 'light-lantern' | 'stoke-fire' | 'splash-spring' | 'turn-sails'
}

const KIND_BY_CATEGORY: Record<WorldObjectDef['category'], InteractionKind> = {
  landmark: 'inspect',
  structure: 'inspect',
  nature: 'discover',
  'landmark-feature': 'read-board',
  character: 'read',
  collectible: 'discover',
}

const EFFECT_BY_ID: Record<string, InteractionOutcome['effect']> = {
  watchtower: 'light-lantern',
  camp: 'stoke-fire',
  spring: 'splash-spring',
  windmill: 'turn-sails',
}

/**
 * Resolve the outcome of interacting with an object.
 * Returns null for unknown or non-interactable IDs.
 */
export function resolveInteraction(id: string): InteractionOutcome | null {
  const object = getObjectById(id)
  if (!object || !object.interactable) return null

  const kind = KIND_BY_CATEGORY[object.category]

  return {
    id: object.id,
    kind,
    title: object.actionLabel ?? `Explore ${object.name}`,
    message: object.lore ?? object.description,
    discovers: object.discoverable,
    ...(EFFECT_BY_ID[object.id] ? { effect: EFFECT_BY_ID[object.id] } : {}),
  }
}

/** Short prompt label for the contextual interaction hint. */
export function promptLabel(id: string | null): string | null {
  if (!id) return null
  const object = getObjectById(id)
  if (!object || !object.interactable) return null
  return object.actionLabel ?? `Explore ${object.name}`
}
