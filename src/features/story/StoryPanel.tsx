import { BookOpen, Lock } from 'lucide-react'
import { STORY_FRAGMENTS, type StoryFragment } from '@/data/story'
import { LEGACY_QUEST } from '@/data/quests'
import { getIsland } from '@/data/islands'
import { storyState } from '@/game/story/story'
import { useGameStore } from '@/store/game-store'

/**
 * The narrative journal.
 *
 * The settlers' story, in their own order. Unlocked fragments read as one
 * continuous tale; locked ones show only where their entry waits, so the
 * journal doubles as gentle guidance without spoiling what it will say.
 * Everything is derived from discoveries — there is no second save state.
 */
export function StoryPanel() {
  const discoveriesByIsland = useGameStore((state) => state.discoveriesByIsland)
  const story = storyState(discoveriesByIsland)

  return (
    <section
      aria-labelledby="story-heading"
      data-testid="story-panel"
      className="rounded-panel border border-forest/20 bg-cream/55 p-4"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-forest text-cream"
        >
          <BookOpen size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="story-heading" className="font-display text-base font-bold text-deep">
              The Story of the Nine
            </h3>
            <span className="font-mono text-xs font-semibold text-muted tabular-nums">
              {story.unlockedCount}/{story.total}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted">
            The first settlers left their story in the world instead of in words. Find the marks and
            it reads itself.
          </p>
        </div>
      </div>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-forest/15"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={story.total}
        aria-valuenow={story.unlockedCount}
        aria-label="Story progress"
      >
        <div
          className="h-full rounded-full bg-leaf transition-[width] duration-500"
          style={{ width: `${(story.unlockedCount / story.total) * 100}%` }}
        />
      </div>

      <ol className="mt-4 space-y-2.5">
        {STORY_FRAGMENTS.map((fragment) =>
          story.unlockedIds.has(fragment.id) ? (
            <UnlockedEntry key={fragment.id} fragment={fragment} />
          ) : (
            <LockedEntry key={fragment.id} fragment={fragment} />
          ),
        )}
      </ol>

      {story.complete ? (
        <p className="mt-3 rounded-xl bg-leaf/15 px-3 py-2 text-sm font-semibold text-forest">
          Every entry found. The settlers' story is yours to retell now.
        </p>
      ) : null}
    </section>
  )
}

function UnlockedEntry({ fragment }: { fragment: StoryFragment }) {
  return (
    <li className="rounded-xl border border-forest/15 bg-cream/70 px-3.5 py-3">
      <p className="font-display text-sm font-bold text-deep">{fragment.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{fragment.body}</p>
    </li>
  )
}

function LockedEntry({ fragment }: { fragment: StoryFragment }) {
  const hint = lockedHint(fragment)

  return (
    <li
      aria-label={`An unwritten entry waits at ${hint}`}
      className="rounded-xl border border-dashed border-forest/25 bg-cream/40 px-3.5 py-2.5"
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold text-muted">
        <Lock size={12} aria-hidden="true" />
        An unwritten entry
      </p>
      <p className="mt-0.5 text-xs text-muted">Waits at {hint}.</p>
    </li>
  )
}

/** Where the explorer should look for this entry, without spoiling its text. */
function lockedHint(fragment: StoryFragment): string {
  switch (fragment.requirement.kind) {
    case 'keepsakes':
      return getIsland(fragment.requirement.islandId).name
    case 'step': {
      const requirement = fragment.requirement
      if (requirement.kind !== 'step') return 'an island you have not reached'
      const step = LEGACY_QUEST.steps.find((entry) => entry.id === requirement.stepId)
      return step ? getIsland(step.islandId).name : 'an island you have not reached'
    }
    case 'campaign-complete':
      return 'the end of the trail'
    default:
      return 'the beginning'
  }
}
