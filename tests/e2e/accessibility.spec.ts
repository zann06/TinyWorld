import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { dismissOnboarding, openJournal, waitForScene } from './helpers'

/**
 * Automated accessibility checks with axe-core.
 *
 * These cover the DOM layer. A canvas cannot be made accessible with ARIA alone,
 * so the important landmark information is also reachable through the island
 * directory, which these tests exercise directly.
 */

async function scan(page: Page) {
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
}

test.describe('accessibility', () => {
  test('the loaded world has no automatically detectable violations', async ({ page }) => {
    await page.goto('/')
    await dismissOnboarding(page)
    await waitForScene(page)

    const results = await scan(page)
    expect(results.violations).toEqual([])
  })

  test('the settings dialog has no violations', async ({ page }) => {
    await page.goto('/')
    await dismissOnboarding(page)
    await waitForScene(page)

    await page.getByRole('button', { name: 'Open settings' }).click()
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()

    const results = await scan(page)
    expect(results.violations).toEqual([])
  })

  test('the discovery journal has no violations', async ({ page }) => {
    await page.goto('/')
    await dismissOnboarding(page)
    await waitForScene(page)

    await openJournal(page)

    const results = await scan(page)
    expect(results.violations).toEqual([])
  })

  test('every landmark is readable as text without the 3D view', async ({ page }) => {
    await page.goto('/')
    await dismissOnboarding(page)
    await waitForScene(page)

    const journalButton = page.getByRole('button', { name: 'Open the discovery journal' })
    if (await journalButton.isVisible()) {
      await journalButton.click()
    } else {
      await page.getByRole('button', { name: 'Journal' }).click()
    }

    const dialog = page.getByRole('dialog', { name: 'Discovery journal' })
    for (const name of [
      'Northwind Lighthouse',
      'Fernhollow Cottage',
      'The Old Windmill',
      'Sunkenroot Dock',
      'The Island Boardwalk',
      'Mossgrave Watchtower',
      'The Tended Garden',
      'Emberfern Camp',
      'The Greenhaven Arch',
      'Coldwater Spring',
    ]) {
      await expect(dialog.getByText(name, { exact: true })).toBeVisible()
    }
  })

  test('honours the prefers-reduced-motion media query', async ({ browser }) => {
    const reduced = await browser.newContext({ reducedMotion: 'reduce' })
    const reducedPage = await reduced.newPage()

    await reducedPage.goto('/')
    await dismissOnboarding(reducedPage)

    // The OS preference is adopted on first run and reflected on the document.
    await expect(reducedPage.locator('html')).toHaveAttribute('data-reduced-motion', 'true')
    await reduced.close()

    const normal = await browser.newContext({ reducedMotion: 'no-preference' })
    const normalPage = await normal.newPage()

    await normalPage.goto('/')
    await dismissOnboarding(normalPage)
    await expect(normalPage.locator('html')).toHaveAttribute('data-reduced-motion', 'false')
    await normal.close()
  })

  test('an explicit user choice overrides the OS preference', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()

    await page.goto('/')
    await dismissOnboarding(page)

    await page.getByRole('button', { name: 'Open settings' }).click()
    const settings = page.getByRole('dialog', { name: 'Settings' })
    await settings.getByRole('switch', { name: 'Reduce motion' }).click()
    await settings.getByRole('button', { name: 'Close Settings' }).click()

    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'false')
    await context.close()
  })
})
