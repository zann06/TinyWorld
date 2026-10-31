import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoryPanel } from '@/features/story/StoryPanel'
import { EpilogueDialog } from '@/features/story/EpilogueDialog'
import { useGameStore } from '@/store/game-store'
import { useUiStore } from '@/store/ui-store'
import { DEFAULT_ISLAND_ID } from '@/data/islands'
import type { DiscoveryEntry } from '@/types'

const GREENHAVEN_KEEPSAKES = ['whisper-shell', 'sunwick-shard', 'fernway-totem']
const CAIRNMOOR_KEEPSAKES = ['stormcall-shell', 'hullglass-shard', 'wayfarer-totem']
const HEARTHFALL_KEEPSAKES = ['emberwhisper-shell', 'firstlight-shard', 'settlers-totem']

/** Seed discoveries onto an island without going through the store actions. */
function seedDiscoveries(islandId: string, ids: string[]): void {
  const entries: DiscoveryEntry[] = ids.map((id, index) => ({ id, discoveredAt: index + 1 }))
  const store = useGameStore.getState()
  useGameStore.setState({
    discoveriesByIsland: { ...store.discoveriesByIsland, [islandId]: entries },
  })
}

/** Return every store to a known state between tests. */
function resetStores(): void {
  useGameStore.setState({
    activeIslandId: DEFAULT_ISLAND_ID,
    selectedId: null,
    nearbyId: null,
    panelOpen: false,
    discoveriesByIsland: {},
    lastDiscoveredId: null,
    toasts: [],
    photoMode: false,
  })
  useUiStore.setState({ overlay: null, blocking: false, panelOpen: false, mobileSheetOpen: false })
}

beforeEach(() => {
  window.localStorage.clear()
  resetStores()
})

describe('StoryPanel', () => {
  it('opens with only the prologue readable and the rest sealed', () => {
    render(<StoryPanel />)

    expect(screen.getByRole('heading', { name: 'The Story of the Nine' })).toBeInTheDocument()
    expect(screen.getByText(/there is a story on these islands/i)).toBeInTheDocument()
    expect(screen.getByText(/1\/10/)).toBeInTheDocument()
    expect(screen.getAllByText(/an unwritten entry/i)).toHaveLength(9)
    // Locked cards guide without spoiling. Cairnmoor hosts two of them.
    expect(screen.getAllByText(/waits at Cairnmoor Isle/i)).toHaveLength(2)
    expect(screen.getByText(/waits at the end of the trail/i)).toBeInTheDocument()
  })

  it('reveals an entry when its step completes', () => {
    seedDiscoveries(DEFAULT_ISLAND_ID, ['boardwalk'])
    render(<StoryPanel />)

    expect(screen.getByText('The Departure Note')).toBeInTheDocument()
    expect(screen.getByText('2/10')).toBeInTheDocument()
    expect(screen.getAllByText(/an unwritten entry/i)).toHaveLength(8)
  })

  it('reads as one finished tale when everything is found', () => {
    seedDiscoveries('greenhaven', ['boardwalk', ...GREENHAVEN_KEEPSAKES])
    seedDiscoveries('cairnmoor', ['cairn', ...CAIRNMOOR_KEEPSAKES])
    seedDiscoveries('hearthfall', [
      'first-hearth',
      'record-wall',
      'tide-bell',
      ...HEARTHFALL_KEEPSAKES,
    ])

    render(<StoryPanel />)

    expect(screen.getByText('The Trail, Finished')).toBeInTheDocument()
    expect(screen.getByText('10/10')).toBeInTheDocument()
    expect(
      screen.getByText(/every entry found\. the settlers' story is yours/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/an unwritten entry/i)).not.toBeInTheDocument()
  })
})

describe('EpilogueDialog', () => {
  it('presents the closing story with the two follow-up actions', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<EpilogueDialog open onClose={onClose} />)

    expect(screen.getByText('The Trail, Finished')).toBeInTheDocument()
    expect(screen.getByText(/you did not restore anything/i)).toBeInTheDocument()

    await user.click(screen.getByTestId('epilogue-close'))
    expect(onClose).toHaveBeenCalledOnce()

    await user.click(screen.getByTestId('epilogue-journal'))
    expect(onClose).toHaveBeenCalledTimes(2)
    expect(useUiStore.getState().overlay).toBe('journal')
  })

  it('renders nothing while closed', () => {
    render(<EpilogueDialog open={false} onClose={() => {}} />)
    expect(screen.queryByTestId('epilogue-dialog')).not.toBeInTheDocument()
  })
})

describe('campaign completion through the store', () => {
  it('opens the epilogue overlay and announces journal entries on discovery', () => {
    useGameStore.getState().interact('boardwalk')

    // The first Legacy step unlocks a story fragment alongside the discovery.
    const titles = useGameStore.getState().toasts.map((toast) => toast.title)
    expect(titles).toContain('Journal — The Departure Note')

    // And completing the whole trail switches the overlay to the epilogue.
    // The bell lives on Hearthfall, so the explorer must be standing there.
    const store = useGameStore.getState()
    useGameStore.setState({
      activeIslandId: 'hearthfall',
      discoveriesByIsland: {
        ...store.discoveriesByIsland,
        cairnmoor: [{ id: 'cairn', discoveredAt: 2 }],
        hearthfall: [
          { id: 'first-hearth', discoveredAt: 3 },
          { id: 'record-wall', discoveredAt: 4 },
        ],
      },
    })
    useGameStore.getState().interact('tide-bell')
    expect(useUiStore.getState().overlay).toBe('epilogue')
    expect(useUiStore.getState().blocking).toBe(true)
  })
})
