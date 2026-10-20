import { expect, test } from './fixtures'
import { dismissOnboarding, expectCanvasNotBlank, openJournal, waitForScene } from './helpers'
import type { Page } from '@playwright/test'

const ISLAND_ORDER = [
  'Cairnmoor Isle',
  'Hearthfall Isle',
  'Greenhaven Island',
  'Hearthfall Isle',
  'Cairnmoor Isle',
  'Greenhaven Island',
] as const

/** Travel through the header switcher and wait for the new scene to render. */
async function travelTo(page: Page, islandName: string): Promise<void> {
  await page.getByTestId('island-switcher').click()
  await page.getByRole('option', { name: new RegExp(islandName) }).click()
  await waitForScene(page)
  await expect(page.getByTestId('island-name')).toHaveText(islandName)
}

/** Close the journal after a discovery so the header becomes clickable again. */
async function closeJournal(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Close Discovery journal' }).click()
  await expect(page.getByRole('dialog', { name: 'Discovery journal' })).toBeHidden()
}

test.describe('travel and scene resilience', () => {
  test('travels back and forth across all three islands without rebuilding errors', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'one desktop budget run is enough')

    const errors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto('/')
    await dismissOnboarding(page)
    await waitForScene(page)

    const started = Date.now()
    for (const islandName of ISLAND_ORDER) {
      await travelTo(page, islandName)
      await expectCanvasNotBlank(page)
    }
    const elapsed = Date.now() - started

    // Visited islands stay mounted, so a trip should not rebuild the scene.
    // The budget is deliberately loose because CI renders WebGL on the CPU.
    expect(elapsed, `six trips took ${elapsed}ms`).toBeLessThan(60_000)
    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0)
  })

  test('advances the Legacy campaign across all three islands', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'one desktop run is enough')

    await page.goto('/')
    await dismissOnboarding(page)
    await waitForScene(page)

    await openJournal(page)
    await page.getByRole('button', { name: 'Read the signpost' }).click()
    await closeJournal(page)

    await travelTo(page, 'Cairnmoor Isle')
    await openJournal(page)
    await page.getByRole('button', { name: 'Add a stone' }).click()
    await closeJournal(page)

    await travelTo(page, 'Hearthfall Isle')
    await openJournal(page)
    await page.getByRole('button', { name: 'Kneel at the hearth' }).click()
    await closeJournal(page)

    await openJournal(page)
    await expect(page.getByTestId('legacy-panel')).toContainText('3/5')
    await expect(page.getByTestId('legacy-panel')).toContainText('The Names')
  })
})
