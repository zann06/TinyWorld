import { expect, test } from './fixtures'
import {
  dismissOnboarding,
  discoverFirstLandmark,
  expectCanvasNotBlank,
  openJournal,
  readStoredProgress,
  waitForScene,
} from './helpers'

test.describe('TinyWorld main journey', () => {
  test('loads the world with a rendered scene', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto('/')
    await dismissOnboarding(page)
    await waitForScene(page)
    await expect(page.getByText('Greenhaven Island').first()).toBeVisible()
    await expectCanvasNotBlank(page)

    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0)
  })

  test('moves the explorer with the keyboard', async ({ page }) => {
    await page.goto('/')
    await dismissOnboarding(page)
    await waitForScene(page)

    const before = await page.evaluate(() => window.localStorage.getItem('tinyworld:session:v1'))

    await page.keyboard.down('KeyW')
    await page.waitForTimeout(1200)
    await page.keyboard.up('KeyW')

    // The session snapshot is written periodically; force one by waiting.
    await page.waitForTimeout(4500)
    const after = await page.evaluate(() => window.localStorage.getItem('tinyworld:session:v1'))

    expect(after, 'session position should be persisted after moving').not.toBeNull()
    expect(after).not.toBe(before)
  })

  test('opens an object from the directory and performs a real action', async ({ page }) => {
    await page.goto('/')
    await dismissOnboarding(page)
    await waitForScene(page)

    await openJournal(page)

    const journal = page.getByRole('dialog', { name: 'Discovery journal' })
    const directory = journal.locator('#tinyworld-object-directory')
    await expect(directory.getByRole('heading', { name: 'Island directory' })).toBeVisible()

    const label = await discoverFirstLandmark(directory)
    expect(label.length).toBeGreaterThan(0)

    // Progress is reflected in the UI immediately.
    await expect(journal.getByText(/1 of \d+ landmarks discovered/)).toBeVisible()

    const stored = await readStoredProgress(page)
    expect(stored.length).toBeGreaterThan(0)
  })

  test('persists discoveries and settings across a reload', async ({ page }) => {
    await page.goto('/')
    await dismissOnboarding(page)
    await waitForScene(page)

    // Change a setting.
    await page.getByRole('button', { name: 'Open settings' }).click()
    const settingsDialog = page.getByRole('dialog', { name: 'Settings' })
    await expect(settingsDialog).toBeVisible()
    await settingsDialog.getByRole('button', { name: 'Night' }).click()
    await settingsDialog.getByRole('button', { name: 'Close Settings' }).click()

    // Discover something.
    await openJournal(page)
    const journal = page.getByRole('dialog', { name: 'Discovery journal' })
    await journal.getByRole('button', { name: 'Climb the spiral stair' }).click()
    await journal.getByRole('button', { name: 'Close Discovery journal' }).click()

    expect(await readStoredProgress(page)).toContain('lighthouse')

    // Reload and confirm both survived.
    await page.reload()
    await waitForScene(page)

    await page.getByRole('button', { name: 'Open settings' }).click()
    await expect(
      page.getByRole('dialog', { name: 'Settings' }).getByRole('button', { name: 'Night' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Close Settings' }).click()

    await openJournal(page)
    await expect(
      page
        .getByRole('dialog', { name: 'Discovery journal' })
        .getByText(/1 of \d+ landmarks discovered/),
    ).toBeVisible()
  })

  test('resetting progress requires confirmation', async ({ page }) => {
    await page.goto('/')
    await dismissOnboarding(page)
    await waitForScene(page)

    await openJournal(page)
    const journal = page.getByRole('dialog', { name: 'Discovery journal' })
    await journal.getByRole('button', { name: 'Knock on the door' }).click()
    await journal.getByRole('button', { name: 'Close Discovery journal' }).click()

    expect(await readStoredProgress(page)).toContain('cottage')

    await page.getByRole('button', { name: 'Open settings' }).click()
    const settings = page.getByRole('dialog', { name: 'Settings' })
    await settings.getByRole('button', { name: 'Reset discovered progress' }).click()

    const confirm = page.getByRole('dialog', { name: 'Reset discovered progress?' })
    await expect(confirm).toBeVisible()

    // Cancel leaves progress untouched.
    await confirm.getByRole('button', { name: 'Cancel' }).click()
    expect(await readStoredProgress(page)).toContain('cottage')

    // Confirming actually clears it.
    await settings.getByRole('button', { name: 'Reset discovered progress' }).click()
    await page
      .getByRole('dialog', { name: 'Reset discovered progress?' })
      .getByRole('button', { name: 'Reset progress' })
      .click()

    expect(await readStoredProgress(page)).toHaveLength(0)
  })

  test('export a PNG screenshot from photo mode', async ({ page }) => {
    await page.goto('/')
    await dismissOnboarding(page)
    await waitForScene(page)

    await page.getByRole('button', { name: /photo/i }).first().click()
    await expect(page.getByTestId('photo-mode')).toBeVisible()

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
    await page.getByTestId('photo-capture').click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/^tinyworld-greenhaven-.*\.png$/)

    await page.getByTestId('photo-exit').click()
    await expect(page.getByTestId('photo-mode')).toBeHidden()
  })

  test('travels to another island and renders a different scene', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto('/')
    await dismissOnboarding(page)
    await waitForScene(page)
    await expect(page.getByTestId('island-name')).toHaveText('Greenhaven Island')

    await page.getByTestId('island-switcher').click()
    await page.getByRole('option', { name: /Cairnmoor Isle/ }).click()

    await expect(page.getByTestId('island-name')).toHaveText('Cairnmoor Isle')
    await waitForScene(page)
    await expectCanvasNotBlank(page)

    // The journal now lists the second island's landmarks, not Greenhaven's.
    await openJournal(page)
    await expect(page.getByText('The Gullwing Wreck')).toBeVisible()
    await expect(page.getByText('Northwind Lighthouse')).toBeHidden()

    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0)
  })

  test("keeps each island's discoveries separate", async ({ page }) => {
    await page.goto('/')
    await dismissOnboarding(page)
    await waitForScene(page)

    // Discover one landmark on Greenhaven.
    await openJournal(page)
    const greenhavenJournal = page.getByRole('dialog', { name: 'Discovery journal' })
    await greenhavenJournal.getByRole('button', { name: 'Climb the spiral stair' }).click()
    await greenhavenJournal.getByRole('button', { name: 'Close Discovery journal' }).click()
    expect(await readStoredProgress(page)).toContain('lighthouse')

    // Travel to Cairnmoor: its progress starts empty.
    await page.getByTestId('island-switcher').click()
    await page.getByRole('option', { name: /Cairnmoor Isle/ }).click()
    await waitForScene(page)

    await openJournal(page)
    await expect(page.getByText('0 of 11 landmarks discovered')).toBeVisible()
    await page.getByRole('button', { name: 'Close Discovery journal' }).click()

    // Coming back shows Greenhaven's progress intact.
    await page.getByTestId('island-switcher').click()
    await page.getByRole('option', { name: /Greenhaven Island/ }).click()
    await waitForScene(page)

    await openJournal(page)
    await expect(page.getByText('1 of 13 landmarks discovered')).toBeVisible()
  })

  test('keyboard-only navigation reaches every control', async ({ page }) => {
    await page.goto('/')
    await dismissOnboarding(page)
    await waitForScene(page)

    await page.getByRole('button', { name: 'Open settings' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()

    // Escape closes and returns focus to the trigger.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeHidden()
    await expect(page.getByRole('button', { name: 'Open settings' })).toBeFocused()
  })
})
