import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LegacyPanel } from '@/features/quests/LegacyPanel'
import { useGameStore } from '@/store/game-store'
import { DEFAULT_ISLAND_ID } from '@/data/islands'
import type { DiscoveryEntry } from '@/types'

function discoveries(...ids: string[]): DiscoveryEntry[] {
  return ids.map((id, index) => ({ id, discoveredAt: index + 1 }))
}

beforeEach(() => {
  window.localStorage.clear()
  useGameStore.setState({
    activeIslandId: DEFAULT_ISLAND_ID,
    discoveriesByIsland: {},
    selectedId: null,
    nearbyId: null,
    panelOpen: false,
    lastDiscoveredId: null,
    toasts: [],
  })
})

describe('LegacyPanel', () => {
  it('shows the first step and the island the player is already on', () => {
    render(<LegacyPanel />)

    expect(screen.getByRole('heading', { name: 'Legacy' })).toBeInTheDocument()
    expect(screen.getByText('0/5')).toBeInTheDocument()
    expect(screen.getByText('The First Mark')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /you are on greenhaven island/i })).toBeDisabled()
  })

  it('guides the player to the next island and travels there', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    useGameStore.setState({
      discoveriesByIsland: {
        greenhaven: discoveries('boardwalk'),
        cairnmoor: discoveries('cairn'),
      },
    })

    render(<LegacyPanel onClose={onClose} />)

    const travel = screen.getByRole('button', { name: /travel to hearthfall isle/i })
    await user.click(travel)

    expect(useGameStore.getState().activeIslandId).toBe('hearthfall')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('reports completion when every step is discovered', () => {
    useGameStore.setState({
      discoveriesByIsland: {
        greenhaven: discoveries('boardwalk'),
        cairnmoor: discoveries('cairn'),
        hearthfall: discoveries('first-hearth', 'record-wall', 'tide-bell'),
      },
    })

    render(<LegacyPanel />)

    expect(screen.getByText('5/5')).toBeInTheDocument()
    expect(screen.getByText(/legacy complete/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /travel to/i })).not.toBeInTheDocument()
  })
})
