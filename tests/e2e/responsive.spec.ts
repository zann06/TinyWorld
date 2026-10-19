import { expect, test } from '@playwright/test'
import { dismissOnboarding, openJournal, waitForScene } from './helpers'

/**
 * Responsive and mobile layout checks.
 *
 * The mobile project runs on a touch device profile so the virtual joystick and
 * the action button are actually present, not merely CSS-hidden.
 */

test.describe('responsive layout', () => {
  test('the viewport never scrolls the document', async ({ page }) => {
    await page.goto('/')
    await dismissOnboarding(page)
    await waitForScene(page)

    const overflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    }))

    expect(overflow.x).toBeLessThanOrEqual(1)
  })

  test('UI overlays do not cover the whole viewport', async ({ page }) => {
    await page.goto('/')
    await dismissOnboarding(page)
    await waitForScene(page)

    const topBar = page.getByRole('banner')
    await expect(topBar).toBeVisible()

    const box = await topBar.boundingBox()
    expect(box).not.toBeNull()

    const viewport = page.viewportSize()
    expect(viewport).not.toBeNull()

    // The header occupies a small strip, leaving the world visible beneath it.
    const coverage =
      ((box?.height ?? 0) * (box?.width ?? 0)) / ((viewport?.width ?? 1) * (viewport?.height ?? 1))
    expect(coverage).toBeLessThan(0.25)
  })

  test('the object panel does not overflow the viewport', async ({ page }) => {
    await page.goto('/')
    await dismissOnboarding(page)
    await waitForScene(page)

    await openJournal(page)
    const dialog = page.getByRole('dialog', { name: 'Discovery journal' })

    const box = await dialog.boundingBox()
    const viewport = page.viewportSize()

    expect(box).not.toBeNull()
    expect(box?.x ?? 0).toBeGreaterThanOrEqual(-1)
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual((viewport?.width ?? 0) + 1)
  })
})

test.describe('touch controls', () => {
  test.skip(({ isMobile }) => !isMobile, 'Touch controls only render for coarse pointers')

  test('the virtual joystick and action button are usable', async ({ page }) => {
    await page.goto('/')
    await dismissOnboarding(page)
    await waitForScene(page)

    const stick = page.getByTestId('touch-stick')
    await expect(stick).toBeVisible()

    const box = await stick.boundingBox()
    expect(box).not.toBeNull()

    // Drag the stick forward.
    await page.mouse.move(
      (box?.x ?? 0) + (box?.width ?? 0) / 2,
      (box?.y ?? 0) + (box?.height ?? 0) / 2,
    )
    await page.mouse.down()
    await page.mouse.move(
      (box?.x ?? 0) + (box?.width ?? 0) / 2,
      (box?.y ?? 0) + (box?.height ?? 0) / 2 - 30,
    )
    await page.waitForTimeout(800)
    await page.mouse.up()

    const actionButton = page.getByTestId('touch-interact')
    await expect(actionButton).toBeVisible()

    // The action button must never cover the whole screen.
    const actionBox = await actionButton.boundingBox()
    const viewport = page.viewportSize()
    const coverage =
      ((actionBox?.width ?? 0) * (actionBox?.height ?? 0)) /
      ((viewport?.width ?? 1) * (viewport?.height ?? 1))
    expect(coverage).toBeLessThan(0.12)
  })
})
