import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ObjectDirectory } from '@/features/discoveries/ObjectDirectory'
import { SettingsDialog } from '@/features/settings/SettingsDialog'
import { IslandSwitcher } from '@/components/layout/IslandSwitcher'
import { useGameStore } from '@/store/game-store'
import { useSettingsStore } from '@/store/settings-store'
import { useUiStore } from '@/store/ui-store'
import { useWorldEffects } from '@/world/objects/world-effects'
import { STORAGE_KEYS, readJson } from '@/lib/storage'
import { DEFAULT_ISLAND_ID, ISLANDS, TOTAL_DISCOVERABLE, getIsland } from '@/data/islands'
import { islandDiscoverableCount } from '@/data/objects'
import type { DiscoveryEntry, WorldObjectDef } from '@/types'

/** First entry of a non-empty list, with a clear failure if it is empty. */
function firstOf(objects: readonly WorldObjectDef[]): WorldObjectDef {
  const first = objects.at(0)
  if (!first) throw new Error('Expected at least one object')
  return first
}

const GREENHAVEN = getIsland('greenhaven')
const CAIRNMOOR = getIsland('cairnmoor')
const GREENHAVEN_OBJECTS = GREENHAVEN.objects
const GREENHAVEN_TOTAL = islandDiscoverableCount(GREENHAVEN)

/** Seed discoveries onto an island without going through the store actions. */
function seedDiscoveries(islandId: string, discoveries: DiscoveryEntry[]): void {
  const store = useGameStore.getState()
  useGameStore.setState({
    discoveriesByIsland: { ...store.discoveriesByIsland, [islandId]: discoveries },
  })
}

/** Discoveries recorded on one island. */
function discoveriesOn(islandId: string): DiscoveryEntry[] {
  return useGameStore.getState().discoveriesByIsland[islandId] ?? []
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
  useSettingsStore.getState().resetSettings()
  useUiStore.setState({ overlay: null, blocking: false, panelOpen: false, mobileSheetOpen: false })
  useWorldEffects.setState({
    lanternLit: false,
    fireStoked: false,
    springTouched: false,
    sailsTurned: 0,
    bellRung: false,
  })
}

/** Narrow a possibly-empty NodeList to its first element. */
function firstButton(buttons: HTMLElement[]): HTMLElement {
  const first = buttons[0]
  if (!first) throw new Error('Expected at least one matching button')
  return first
}

/** Narrow a possibly-short NodeList to a specific index. */
function nthButton(buttons: HTMLElement[], index: number): HTMLElement {
  const button = buttons[index]
  if (!button) throw new Error(`Expected a button at index ${index}`)
  return button
}

beforeEach(() => {
  window.localStorage.clear()
  resetStores()
})

describe('ObjectDirectory', () => {
  it('lists every landmark with its category and discovery status', () => {
    render(<ObjectDirectory />)

    expect(screen.getByRole('heading', { name: 'Island directory' })).toBeInTheDocument()

    for (const object of GREENHAVEN_OBJECTS) {
      expect(screen.getByText(object.name)).toBeInTheDocument()
    }
  })

  it('reports progress in a live region', () => {
    render(<ObjectDirectory />)

    expect(screen.getByText(`0 of ${GREENHAVEN_TOTAL} landmarks discovered`)).toBeInTheDocument()
  })

  it('lists the other island once it becomes active', () => {
    useGameStore.setState({ activeIslandId: CAIRNMOOR.id })
    render(<ObjectDirectory />)

    expect(screen.getByText(firstOf(CAIRNMOOR.objects).name)).toBeInTheDocument()
    expect(screen.queryByText(firstOf(GREENHAVEN_OBJECTS).name)).not.toBeInTheDocument()
    expect(
      screen.getByText(`0 of ${islandDiscoverableCount(CAIRNMOOR)} landmarks discovered`),
    ).toBeInTheDocument()
  })

  it('reveals the full description once an object is discovered', () => {
    seedDiscoveries(DEFAULT_ISLAND_ID, [{ id: 'lighthouse', discoveredAt: 1 }])
    render(<ObjectDirectory />)

    const card = screen.getByText('Northwind Lighthouse').closest('li')
    expect(card).not.toBeNull()
    expect(
      within(card as HTMLElement).getByText(/rebuilt in stone after the great storm/i),
    ).toBeInTheDocument()
  })

  it('filters by discovery status', async () => {
    const user = userEvent.setup()
    seedDiscoveries(DEFAULT_ISLAND_ID, [{ id: 'lighthouse', discoveredAt: 1 }])
    render(<ObjectDirectory />)

    await user.click(screen.getByRole('button', { name: 'Found' }))
    expect(screen.getByText('Northwind Lighthouse')).toBeInTheDocument()
    expect(screen.queryByText('Fernhollow Cottage')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Missing' }))
    expect(screen.queryByText('Northwind Lighthouse')).not.toBeInTheDocument()
  })

  it('searches by name', async () => {
    const user = userEvent.setup()
    render(<ObjectDirectory />)

    await user.type(screen.getByRole('searchbox', { name: /search landmarks/i }), 'dock')
    expect(screen.getByText('Sunkenroot Dock')).toBeInTheDocument()
    expect(screen.queryByText('Northwind Lighthouse')).not.toBeInTheDocument()
  })

  it('shows an empty state when nothing matches', async () => {
    const user = userEvent.setup()
    render(<ObjectDirectory />)

    await user.type(screen.getByRole('searchbox', { name: /search landmarks/i }), 'zzzzz')
    expect(screen.getByText(/no landmarks match your search/i)).toBeInTheDocument()
  })

  it('selects an object in the world from the directory', async () => {
    const user = userEvent.setup()
    render(<ObjectDirectory />)

    await user.click(firstButton(screen.getAllByRole('button', { name: /select in world/i })))
    expect(useGameStore.getState().selectedId).toBe(firstOf(GREENHAVEN_OBJECTS).id)
  })

  it('performs a real interaction that records a discovery', async () => {
    const user = userEvent.setup()
    render(<ObjectDirectory />)

    await user.click(screen.getByRole('button', { name: 'Climb the spiral stair' }))

    const discoveries = discoveriesOn(DEFAULT_ISLAND_ID)
    expect(discoveries.map((entry) => entry.id)).toEqual(['lighthouse'])
    expect(useGameStore.getState().toasts).toHaveLength(1)
  })

  it('persists discoveries under the active island', async () => {
    const user = userEvent.setup()
    render(<ObjectDirectory />)

    await user.click(screen.getByRole('button', { name: 'Read the signpost' }))

    const stored = readJson<{ version: number; islands: Record<string, { id: string }[]> }>(
      STORAGE_KEYS.progress,
      { version: 2, islands: {} },
    )
    expect(stored.version).toBe(2)
    expect(stored.islands[DEFAULT_ISLAND_ID]?.map((entry) => entry.id)).toEqual(['boardwalk'])
  })

  it('does not double-count a repeated interaction', async () => {
    const user = userEvent.setup()
    render(<ObjectDirectory />)

    const button = screen.getByRole('button', { name: 'Climb the spiral stair' })
    await user.click(button)
    await user.click(button)
    expect(discoveriesOn(DEFAULT_ISLAND_ID)).toHaveLength(1)
  })
})

describe('IslandSwitcher', () => {
  it('starts closed and names the active island', () => {
    render(<IslandSwitcher />)

    expect(screen.getByTestId('island-switcher')).toHaveTextContent(GREENHAVEN.name)
    expect(screen.queryByTestId('island-switcher-list')).not.toBeInTheDocument()
  })

  it('lists every island with its progress when opened', async () => {
    const user = userEvent.setup()
    seedDiscoveries(CAIRNMOOR.id, [{ id: 'wreck', discoveredAt: 1 }])
    render(<IslandSwitcher />)

    await user.click(screen.getByTestId('island-switcher'))

    for (const island of ISLANDS) {
      expect(screen.getByRole('option', { name: new RegExp(island.name) })).toBeInTheDocument()
    }
    expect(
      screen.getByText(`1/${islandDiscoverableCount(CAIRNMOOR)} discovered`),
    ).toBeInTheDocument()
  })

  it('travels to another island and clears the selection', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ selectedId: 'lighthouse', nearbyId: 'lighthouse' })
    render(<IslandSwitcher />)

    await user.click(screen.getByTestId('island-switcher'))
    await user.click(screen.getByRole('option', { name: new RegExp(CAIRNMOOR.name) }))

    const state = useGameStore.getState()
    expect(state.activeIslandId).toBe(CAIRNMOOR.id)
    expect(state.selectedId).toBeNull()
    expect(state.nearbyId).toBeNull()
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<IslandSwitcher />)

    const trigger = screen.getByTestId('island-switcher')
    await user.click(trigger)
    expect(screen.getByTestId('island-switcher-list')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByTestId('island-switcher-list')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('ignores an unknown island id', () => {
    useGameStore.getState().setActiveIsland('atlantis')
    expect(useGameStore.getState().activeIslandId).toBe(DEFAULT_ISLAND_ID)
  })
})

describe('SettingsDialog', () => {
  it('renders the settings controls', () => {
    render(<SettingsDialog open onClose={() => {}} />)

    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Graphics quality' })).toBeInTheDocument()
    expect(screen.getByLabelText(/sensitivity/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/volume/i)).toBeInTheDocument()
  })

  it('persists a graphics quality change', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Low' }))

    expect(useSettingsStore.getState().quality).toBe('low')
    const stored = readJson<{ quality: string }>(STORAGE_KEYS.settings, { quality: 'high' })
    expect(stored.quality).toBe('low')
  })

  it('persists the time of day', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Night' }))
    expect(useSettingsStore.getState().timeOfDay).toBe('night')
  })

  it('toggles reduced motion and reflects it on the document', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open onClose={() => {}} />)

    await user.click(screen.getByRole('switch', { name: 'Reduce motion' }))
    expect(useSettingsStore.getState().reducedMotion).toBe(true)
  })

  it('disables the volume slider while muted', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open onClose={() => {}} />)

    const volume = screen.getByLabelText(/volume/i)
    expect(volume).toBeEnabled()

    await user.click(screen.getByRole('switch', { name: 'Mute ambient sound' }))
    expect(volume).toBeDisabled()
  })

  it('requires confirmation before resetting discoveries', async () => {
    const user = userEvent.setup()
    seedDiscoveries(DEFAULT_ISLAND_ID, [{ id: 'lighthouse', discoveredAt: 1 }])
    render(<SettingsDialog open onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Reset discovered progress' }))

    // Still present: the destructive action has not run yet.
    expect(discoveriesOn(DEFAULT_ISLAND_ID)).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(discoveriesOn(DEFAULT_ISLAND_ID)).toHaveLength(1)
  })

  it('clears discoveries once the reset is confirmed', async () => {
    const user = userEvent.setup()
    seedDiscoveries(DEFAULT_ISLAND_ID, [{ id: 'lighthouse', discoveredAt: 1 }])
    render(<SettingsDialog open onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Reset discovered progress' }))
    await user.click(firstButton(screen.getAllByRole('button', { name: 'Reset progress' })))

    expect(discoveriesOn(DEFAULT_ISLAND_ID)).toHaveLength(0)
  })

  it('resets only the active island', async () => {
    const user = userEvent.setup()
    seedDiscoveries(DEFAULT_ISLAND_ID, [{ id: 'lighthouse', discoveredAt: 1 }])
    seedDiscoveries(CAIRNMOOR.id, [{ id: 'wreck', discoveredAt: 1 }])
    render(<SettingsDialog open onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Reset discovered progress' }))
    await user.click(firstButton(screen.getAllByRole('button', { name: 'Reset progress' })))

    expect(discoveriesOn(DEFAULT_ISLAND_ID)).toHaveLength(0)
    expect(discoveriesOn(CAIRNMOOR.id)).toHaveLength(1)
  })

  it('resets settings back to defaults', async () => {
    const user = userEvent.setup()
    useSettingsStore.getState().setMasterVolume(0.1)
    render(<SettingsDialog open onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Reset settings' }))
    await user.click(nthButton(screen.getAllByRole('button', { name: 'Reset settings' }), 1))

    expect(useSettingsStore.getState().masterVolume).toBeGreaterThan(0.1)
  })
})

describe('game store actions', () => {
  it('applies a world effect when interacting', () => {
    useGameStore.getState().interact('watchtower')
    expect(useWorldEffects.getState().lanternLit).toBe(true)
  })

  it('does not apply the same world effect twice', () => {
    useGameStore.getState().interact('camp')
    expect(useWorldEffects.getState().fireStoked).toBe(true)
    useGameStore.getState().interact('camp')
    expect(useWorldEffects.getState().fireStoked).toBe(true)
  })

  it('announces the first Legacy step when its landmark is discovered', () => {
    useGameStore.getState().interact('boardwalk')

    expect(useGameStore.getState().toasts.map((toast) => toast.title)).toContain(
      'Legacy — The First Mark',
    )
  })

  it('announces the gap-filling step when earlier out-of-order discoveries exist', () => {
    useGameStore.setState({
      activeIslandId: 'cairnmoor',
      discoveriesByIsland: {
        greenhaven: [{ id: 'boardwalk', discoveredAt: 1 }],
        hearthfall: [{ id: 'first-hearth', discoveredAt: 2 }],
      },
    })

    useGameStore.getState().interact('cairn')

    const titles = useGameStore.getState().toasts.map((toast) => toast.title)
    expect(titles).toContain('Legacy — The Watchers')
    expect(titles).not.toContain('Legacy — The First Fire')
  })

  it('does not advance Legacy out of order', () => {
    useGameStore.getState().setActiveIsland('hearthfall')
    useGameStore.getState().interact('tide-bell')

    expect(useGameStore.getState().toasts.map((toast) => toast.title)).not.toContain(
      'Legacy — The First Mark',
    )
    expect(useGameStore.getState().toasts.some((toast) => toast.title.startsWith('Legacy'))).toBe(
      false,
    )
  })

  it('opens a panel and selects the object', () => {
    useGameStore.getState().openPanel('cottage')
    expect(useGameStore.getState().panelOpen).toBe(true)
    expect(useGameStore.getState().selectedId).toBe('cottage')
  })

  it('refuses to open a panel for an unknown object', () => {
    useGameStore.getState().openPanel('not-real')
    expect(useGameStore.getState().panelOpen).toBe(false)
  })

  it("refuses to open a panel for another island's object", () => {
    useGameStore.getState().openPanel('wreck')
    expect(useGameStore.getState().panelOpen).toBe(false)
  })

  it('ignores interaction with an unknown object', () => {
    useGameStore.getState().interact('not-real')
    expect(useGameStore.getState().toasts).toHaveLength(0)
  })

  it("ignores interaction with another island's object", () => {
    useGameStore.getState().interact('wreck')
    expect(useGameStore.getState().toasts).toHaveLength(0)
  })

  it('clears transient world effects when travelling', () => {
    useGameStore.getState().interact('watchtower')
    expect(useWorldEffects.getState().lanternLit).toBe(true)

    useGameStore.getState().setActiveIsland(CAIRNMOOR.id)
    expect(useWorldEffects.getState().lanternLit).toBe(false)
  })

  it('caps the toast stack', () => {
    for (let i = 0; i < 6; i += 1) {
      useGameStore.getState().pushToast({ title: 'Toast', description: '', variant: 'info' })
    }
    expect(useGameStore.getState().toasts).toHaveLength(3)
  })

  it('dismisses a toast by id', () => {
    useGameStore.getState().pushToast({ title: 'Toast', description: '', variant: 'info' })
    const id = useGameStore.getState().toasts[0]?.id ?? ''
    useGameStore.getState().dismissToast(id)
    expect(useGameStore.getState().toasts.map((toast) => toast.title)).toEqual([])
  })

  it('restores persisted discoveries on hydrate and drops corrupt ones', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.progress,
      JSON.stringify({
        version: 2,
        islands: {
          [DEFAULT_ISLAND_ID]: [
            { id: 'lighthouse', discoveredAt: 5 },
            { id: 'ghost-landmark', discoveredAt: 6 },
          ],
        },
      }),
    )

    useGameStore.getState().hydrate()
    expect(discoveriesOn(DEFAULT_ISLAND_ID).map((entry) => entry.id)).toEqual(['lighthouse'])
  })

  it('migrates a version 1 save on hydrate', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.progress,
      JSON.stringify({ version: 1, discoveries: [{ id: 'cottage', discoveredAt: 3 }] }),
    )

    useGameStore.getState().hydrate()
    expect(discoveriesOn(DEFAULT_ISLAND_ID).map((entry) => entry.id)).toEqual(['cottage'])
  })

  it('keeps discoveries for both islands apart', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.progress,
      JSON.stringify({
        version: 2,
        islands: {
          [DEFAULT_ISLAND_ID]: [{ id: 'lighthouse', discoveredAt: 1 }],
          [CAIRNMOOR.id]: [{ id: 'wreck', discoveredAt: 2 }],
        },
      }),
    )

    useGameStore.getState().hydrate()
    expect(discoveriesOn(DEFAULT_ISLAND_ID).map((entry) => entry.id)).toEqual(['lighthouse'])
    expect(discoveriesOn(CAIRNMOOR.id).map((entry) => entry.id)).toEqual(['wreck'])
  })

  it('survives a corrupted progress payload', () => {
    window.localStorage.setItem(STORAGE_KEYS.progress, 'not json at all')
    expect(() => useGameStore.getState().hydrate()).not.toThrow()
    expect(useGameStore.getState().discoveriesByIsland).toEqual({})
  })

  it('counts every island landmark in the world total', () => {
    expect(TOTAL_DISCOVERABLE).toBeGreaterThan(GREENHAVEN_TOTAL)
  })
})

describe('settings store actions', () => {
  it('clamps sensitivity and volume', () => {
    const store = useSettingsStore.getState()
    store.setCameraSensitivity(100)
    expect(useSettingsStore.getState().cameraSensitivity).toBe(3)

    store.setMasterVolume(-1)
    expect(useSettingsStore.getState().masterVolume).toBe(0)
  })

  it('hydrates valid persisted settings', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ quality: 'low', masterVolume: 0.25 }),
    )

    useSettingsStore.getState().hydrate()
    expect(useSettingsStore.getState().quality).toBe('low')
  })

  it('ignores invalid persisted settings', () => {
    window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ quality: 'bogus' }))
    useSettingsStore.getState().hydrate()
    expect(useSettingsStore.getState().quality).toBe('high')
  })
})
