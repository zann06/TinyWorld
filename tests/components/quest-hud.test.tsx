import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestTracker } from '@/features/quests/QuestTracker'
import { ObjectiveCompass } from '@/features/quests/ObjectiveCompass'
import { useGameStore } from '@/store/game-store'
import { DEFAULT_ISLAND_ID } from '@/data/islands'
import type { DiscoveryEntry } from '@/types'

/** Seed discoveries onto an island without going through the store actions. */
function seedDiscoveries(islandId: string, discoveries: DiscoveryEntry[]): void {
  const store = useGameStore.getState()
  useGameStore.setState({
    discoveriesByIsland: { ...store.discoveriesByIsland, [islandId]: discoveries },
  })
}

/** Return the game store to a known state between tests. */
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
}

beforeEach(() => {
  window.localStorage.clear()
  resetStores()
})

describe('QuestTracker', () => {
  it('shows the current Legacy objective while the campaign is running', () => {
    render(<QuestTracker />)

    expect(screen.getByTestId('quest-tracker-title')).toHaveTextContent('The First Mark')
    expect(screen.getByTestId('quest-tracker-hint')).toHaveTextContent(/boardwalk sign/i)
    expect(screen.getByText(/Greenhaven Island/)).toBeInTheDocument()
    // The objective is on the active island, so no travel button is offered.
    expect(screen.queryByTestId('quest-tracker-travel')).not.toBeInTheDocument()
  })

  it('offers travel when the objective is on another island', async () => {
    const user = userEvent.setup()
    seedDiscoveries(DEFAULT_ISLAND_ID, [{ id: 'boardwalk', discoveredAt: 1 }])
    render(<QuestTracker />)

    expect(screen.getByTestId('quest-tracker-title')).toHaveTextContent('The Watchers')

    const travel = screen.getByTestId('quest-tracker-travel')
    expect(travel).toHaveTextContent(/Travel to Cairnmoor Isle/)

    await user.click(travel)
    expect(useGameStore.getState().activeIslandId).toBe('cairnmoor')
  })

  it('shows the completed campaign state', () => {
    seedDiscoveries('greenhaven', [{ id: 'boardwalk', discoveredAt: 1 }])
    seedDiscoveries('cairnmoor', [{ id: 'cairn', discoveredAt: 2 }])
    seedDiscoveries('hearthfall', [
      { id: 'first-hearth', discoveredAt: 3 },
      { id: 'record-wall', discoveredAt: 4 },
      { id: 'tide-bell', discoveredAt: 5 },
    ])

    render(<QuestTracker />)

    expect(screen.getByText(/Campaign complete/i)).toBeInTheDocument()
    expect(screen.queryByTestId('quest-tracker-title')).not.toBeInTheDocument()
  })
})

describe('ObjectiveCompass', () => {
  it('renders for the objective on the active island', () => {
    render(<ObjectiveCompass />)

    const compass = screen.getByTestId('objective-compass')
    expect(compass).toHaveAttribute('aria-label', 'Compass pointing to The Island Boardwalk')
  })

  it('hides itself when the objective is on another island', () => {
    seedDiscoveries(DEFAULT_ISLAND_ID, [{ id: 'boardwalk', discoveredAt: 1 }])
    render(<ObjectiveCompass />)

    expect(screen.queryByTestId('objective-compass')).not.toBeInTheDocument()
  })

  it('hides itself once the campaign is complete', () => {
    seedDiscoveries('greenhaven', [{ id: 'boardwalk', discoveredAt: 1 }])
    seedDiscoveries('cairnmoor', [{ id: 'cairn', discoveredAt: 2 }])
    seedDiscoveries('hearthfall', [
      { id: 'first-hearth', discoveredAt: 3 },
      { id: 'record-wall', discoveredAt: 4 },
      { id: 'tide-bell', discoveredAt: 5 },
    ])

    render(<ObjectiveCompass />)

    expect(screen.queryByTestId('objective-compass')).not.toBeInTheDocument()
  })
})
