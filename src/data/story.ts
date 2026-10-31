/**
 * The narrative layer of TinyWorld.
 *
 * The Legacy campaign is a trail of marks; these fragments are the story the
 * marks tell when read in order — the tale of the Nine, the first settlers,
 * who left Greenhaven heading west and never explained why. The journal
 * reveals one fragment at a time as the explorer follows their route.
 *
 * Fragments are ordered here in *reading* order, which is the settlers'
 * chronological order, not the order they are usually found in. Locking is
 * derived from discoveries (see `src/game/story/story.ts`); nothing here is
 * ever persisted, so the story can never disagree with the save file.
 */

export type StoryRequirement =
  | { kind: 'always' }
  | { kind: 'step'; stepId: string }
  | { kind: 'keepsakes'; islandId: string }
  | { kind: 'campaign-complete' }

export interface StoryFragment {
  /** Stable identifier. Never rename without a migration. */
  id: string
  title: string
  body: string
  requirement: StoryRequirement
}

export const STORY_FRAGMENTS: readonly StoryFragment[] = [
  {
    id: 'prologue',
    title: 'Before the Trail',
    body: 'There is a story on these islands that nobody tells out loud, because it was never written down. It was left instead — in paint, in stone, in ash, in the way a bell is rung. Nine people crossed these waters long before the lighthouse had a name, and everything they wanted remembered, they built into the path itself. You are walking through it now. This journal collects what you find, in the order they left it.',
    requirement: { kind: 'always' },
  },
  {
    id: 'greenhaven-receipts',
    title: 'The Receipts',
    body: 'Before the Nine left Greenhaven they left three small things behind: a shell, a shard, a totem. Not valuables — receipts. The way you leave a key with a neighbour: proof that the place was trusted, and a reason to come back. Each one sits exactly where a stranger would find it, which was the whole point.',
    requirement: { kind: 'keepsakes', islandId: 'greenhaven' },
  },
  {
    id: 'departure-note',
    title: 'The Departure Note',
    body: 'The oldest paint on the boardwalk sign is not a warning and not a welcome. It is a departure note: gone west, keep the light on your left, we will keep a fire going. Whoever painted it expected to be followed, and said so in the calmest possible way. Nobody has ever found the destination it named — because the destination was not a place. It was the next island over, and the one after that.',
    requirement: { kind: 'step', stepId: 'legacy-first-mark' },
  },
  {
    id: 'the-watchers',
    title: 'The Watchers',
    body: 'On Cairnmoor, the stones do the talking. Someone stacked a cairn tall enough to be seen from the water, then turned its flat stone outward — not a grave, not a boundary, but a message: you are on the right path, and someone checked it before you. The counting began here, and it has never stopped. Every stone added by every visitor since is the same sentence, said again.',
    requirement: { kind: 'step', stepId: 'legacy-watchers' },
  },
  {
    id: 'forty-one-rings',
    title: 'Forty-One Rings',
    body: 'The Wayfarer Totem near the wreck counts forty-one days, one ring each, carved by a crew that waited for a tide that never brought their ship home. The Nine passed this island and did not wait. That was not carelessness — the totem taught them the difference between being stranded and being between places. One is a place. The other is a story you are inside of.',
    requirement: { kind: 'keepsakes', islandId: 'cairnmoor' },
  },
  {
    id: 'first-hearth',
    title: 'The First Hearth',
    body: 'The First Hearth was lit before anything else on Hearthfall was built, and it was lit for the same reason the signpost pointed west: so that whoever came next would find the islands warm. The fire has been allowed to go out a thousand times — that was always fine. The ash has never once been left wet. That is the whole promise, kept in the smallest possible way.',
    requirement: { kind: 'step', stepId: 'legacy-first-fire' },
  },
  {
    id: 'kept-spark',
    title: 'The Kept Spark',
    body: 'Firstlight Shard is the size of a thumb and older than every chart. The Nine carried it the whole way — through Cairnmoor gales, across two open crossings — so that the First Hearth would never need to be started from nothing. It is a small thing to walk that far for. Most true things are.',
    requirement: { kind: 'keepsakes', islandId: 'hearthfall' },
  },
  {
    id: 'record-wall',
    title: 'The Record Wall',
    body: 'The Record Wall was meant to hold nine names. It holds twenty-six now, carved in the order people arrived, and the writing changes because the hands changed. The first nine are deep and sure. The last line is shallower, hurried, and carved by someone who expected to stay — which, the islanders will tell you, they did. It was never a memorial. It is a guest book that never closed.',
    requirement: { kind: 'step', stepId: 'legacy-names' },
  },
  {
    id: 'the-bell',
    title: 'The Bell Rings for Leaving',
    body: 'Everyone assumes the Tide Bell rings for arrivals. It has never once done that. It rings for departures — once, unhurried — because on these islands, leaving is not the opposite of staying. It is how you promise to come back. Ring it yourself and you will hear what the Nine heard on their last day: one clean note that means someone is expected home.',
    requirement: { kind: 'step', stepId: 'legacy-bell' },
  },
  {
    id: 'trail-finished',
    title: 'The Trail, Finished',
    body: 'You did not restore anything. Nothing was broken. You walked a trail left by nine people who believed the best way to be remembered was to make the way easier for the next one — and somewhere between the signpost and the bell, that belief became yours. The lighthouse still turns. The cairn still watches. The hearth still takes a spark. The islands were never waiting to be found. They were waiting for you to stay long enough to notice. The Record Wall, for what it is worth, has room.',
    requirement: { kind: 'campaign-complete' },
  },
]

/** The fragment shown as the full-screen ending when the campaign completes. */
export const EPILOGUE_FRAGMENT_ID = 'trail-finished'

export function getFragmentById(id: string): StoryFragment | undefined {
  return STORY_FRAGMENTS.find((fragment) => fragment.id === id)
}
