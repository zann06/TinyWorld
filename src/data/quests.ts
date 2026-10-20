/**
 * The "Legacy" campaign.
 *
 * The first people to settle the three islands left a handful of marks behind.
 * Following them in order takes the explorer from Greenhaven to Cairnmoor and
 * finally to Hearthfall. Quest progress is derived from discoveries, which are
 * already persisted per island, so there is no second save file to migrate.
 */
export interface QuestStep {
  /** Stable identifier. Never rename without a migration. */
  id: string
  title: string
  /** One line shown when the step is completed. */
  completion: string
  /** Guidance shown before the step is reached. */
  hint: string
  islandId: string
  objectId: string
}

export interface QuestDefinition {
  id: string
  name: string
  tagline: string
  description: string
  steps: readonly QuestStep[]
}

export const LEGACY_QUEST: QuestDefinition = {
  id: 'legacy',
  name: 'Legacy',
  tagline: 'The marks the first settlers left across the three islands.',
  description:
    'Long before the lighthouse and the boathouse, someone lit a fire on Hearthfall and started counting. Follow the oldest marks in order — Greenhaven, Cairnmoor, then Hearthfall — and finish what they started.',
  steps: [
    {
      id: 'legacy-first-mark',
      title: 'The First Mark',
      completion: 'The oldest paint on the boardwalk sign points west, toward Cairnmoor.',
      hint: 'On Greenhaven, read the boardwalk sign closely enough to see the oldest layer of paint.',
      islandId: 'greenhaven',
      objectId: 'boardwalk',
    },
    {
      id: 'legacy-watchers',
      title: 'The Watchers',
      completion:
        "The cairn's flat stone has been turned outward since before the island had a name.",
      hint: 'On Cairnmoor, add a stone to the Watcher’s Cairn and turn the flat marker outward.',
      islandId: 'cairnmoor',
      objectId: 'cairn',
    },
    {
      id: 'legacy-first-fire',
      title: 'The First Fire',
      completion:
        'The First Hearth catches again, and the ash is still dry enough to take a spark.',
      hint: 'On Hearthfall, kneel at the First Hearth and relight the oldest fire on the islands.',
      islandId: 'hearthfall',
      objectId: 'first-hearth',
    },
    {
      id: 'legacy-names',
      title: 'The Names',
      completion: 'Twenty-six names. The last line was carved by someone who expected to stay.',
      hint: 'On Hearthfall, trace the carved names on the Record Wall.',
      islandId: 'hearthfall',
      objectId: 'record-wall',
    },
    {
      id: 'legacy-bell',
      title: 'The Bell',
      completion: 'The Tide Bell rings once for a safe return. Legacy is complete.',
      hint: 'On Hearthfall, ring the Tide Bell where the path meets the water.',
      islandId: 'hearthfall',
      objectId: 'tide-bell',
    },
  ],
}
