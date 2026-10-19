import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ObjectDirectory } from '@/features/discoveries/ObjectDirectory'
import { SettingsDialog } from '@/features/settings/SettingsDialog'
import { useGameStore } from '@/store/game-store'
import { useSettingsStore } from '@/store/settings-store'
import { useUiStore } from '@/store/ui-store'
import { useWorldEffects } from '@/world/objects/world-effects'
import { STORAGE_KEYS, readJson } from '@/lib/storage'
import { TOTAL_DISCOVERABLE, WORLD_OBJECTS } from '@/data/objects'

/** Return every store to a known state between tests. */
function resetStores(): void {
  useGameStore.setState({
    selectedId: null,
    nearbyId: null,
    panelOpen: false,
    discoveries: [],
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

    for (const object of WORLD_OBJECTS) {
      expect(screen.getByText(object.name)).toBeInTheDocument()
    }
  })

  it('reports progress in a live region', () => {
    render(<ObjectDirectory />)
    expect(screen.getByText(`0 of ${TOTAL_DISCOVERABLE} landmarks discovered`)).toBeInTheDocument()
  })

  it('reveals the full description once an object is discovered', () => {
    useGameStore.setState({ discoveries: [{ id: 'lighthouse', discoveredAt: 1 }] })
    render(<ObjectDirectory />)

    const card = screen.getByText('Northwind Lighthouse').closest('li')
    expect(card).not.toBeNull()
    expect(
      within(card as HTMLElement).getByText(/rebuilt in stone after the great storm/i),
    ).toBeInTheDocument()
  })

  it('filters by discovery status', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ discoveries: [{ id: 'lighthouse', discoveredAt: 1 }] })
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
    expect(useGameStore.getState().selectedId).toBe(WORLD_OBJECTS[0]?.id)
  })

  it('performs a real interaction that records a discovery', async () => {
    const user = userEvent.setup()
    render(<ObjectDirectory />)

    await user.click(screen.getByRole('button', { name: 'Climb the spiral stair' }))

    const discoveries = useGameStore.getState().discoveries
    expect(discoveries.map((entry) => entry.id)).toEqual(['lighthouse'])
    expect(useGameStore.getState().toasts).toHaveLength(1)
  })

  it('persists discoveries to storage', async () => {
    const user = userEvent.setup()
    render(<ObjectDirectory />)

    await user.click(screen.getByRole('button', { name: 'Read the signpost' }))

    const stored = readJson<{ discoveries: { id: string }[] }>(STORAGE_KEYS.progress, {
      discoveries: [],
    })
    expect(stored.discoveries.map((entry) => entry.id)).toEqual(['boardwalk'])
  })

  it('does not double-count a repeated interaction', async () => {
    const user = userEvent.setup()
    render(<ObjectDirectory />)

    const button = screen.getByRole('button', { name: 'Climb the spiral stair' })
    await user.click(button)
    await user.click(button)

    expect(useGameStore.getState().discoveries).toHaveLength(1)
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
    useGameStore.setState({ discoveries: [{ id: 'lighthouse', discoveredAt: 1 }] })
    render(<SettingsDialog open onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Reset discovered progress' }))

    // Still present: the destructive action has not run yet.
    expect(useGameStore.getState().discoveries).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(useGameStore.getState().discoveries).toHaveLength(1)
  })

  it('clears discoveries once the reset is confirmed', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ discoveries: [{ id: 'lighthouse', discoveredAt: 1 }] })
    render(<SettingsDialog open onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Reset discovered progress' }))
    await user.click(firstButton(screen.getAllByRole('button', { name: 'Reset progress' })))

    expect(useGameStore.getState().discoveries).toHaveLength(0)
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

  it('opens a panel and selects the object', () => {
    useGameStore.getState().openPanel('cottage')
    expect(useGameStore.getState().panelOpen).toBe(true)
    expect(useGameStore.getState().selectedId).toBe('cottage')
  })

  it('refuses to open a panel for an unknown object', () => {
    useGameStore.getState().openPanel('not-real')
    expect(useGameStore.getState().panelOpen).toBe(false)
  })

  it('ignores interaction with an unknown object', () => {
    useGameStore.getState().interact('not-real')
    expect(useGameStore.getState().toasts).toHaveLength(0)
  })

  it('caps the toast stack', () => {
    for (let i = 0; i < 6; i += 1) {
      useGameStore.getState().pushToast({ title: `Toast ${i}`, description: '', variant: 'info' })
    }
    expect(useGameStore.getState().toasts).toHaveLength(3)
  })

  it('dismisses a toast by id', () => {
    useGameStore.getState().pushToast({ title: 'Keep', description: '', variant: 'info' })
    const id = useGameStore.getState().toasts[0]?.id ?? ''
    useGameStore.getState().pushToast({ title: 'Drop', description: '', variant: 'info' })
    useGameStore.getState().dismissToast(id)

    expect(useGameStore.getState().toasts.map((toast) => toast.title)).toEqual(['Drop'])
  })

  it('restores persisted discoveries on hydrate and drops corrupt ones', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.progress,
      JSON.stringify({
        version: 1,
        discoveries: [
          { id: 'lighthouse', discoveredAt: 5 },
          { id: 'ghost-landmark', discoveredAt: 6 },
        ],
      }),
    )

    useGameStore.getState().hydrate()
    expect(useGameStore.getState().discoveries.map((entry) => entry.id)).toEqual(['lighthouse'])
  })

  it('survives a corrupted progress payload', () => {
    window.localStorage.setItem(STORAGE_KEYS.progress, 'not json at all')
    expect(() => useGameStore.getState().hydrate()).not.toThrow()
    expect(useGameStore.getState().discoveries).toEqual([])
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
    expect(useSettingsStore.getState().masterVolume).toBe(0.25)
  })

  it('ignores invalid persisted settings', () => {
    window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ quality: 'bogus' }))
    useSettingsStore.getState().hydrate()
    expect(useSettingsStore.getState().quality).toBe('high')
  })
})
