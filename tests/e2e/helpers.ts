import { expect, type Locator, type Page } from '@playwright/test'

/** Dismiss the first-visit onboarding guide if it is showing. */
export async function dismissOnboarding(page: Page): Promise<void> {
  const startButton = page.getByTestId('onboarding-start')

  // Software WebGL makes first paint slow on CI, so this waits generously.
  await startButton.waitFor({ state: 'visible', timeout: 30_000 })
  await startButton.click()
  await expect(startButton).toBeHidden({ timeout: 20_000 })
}

/** Wait until the R3F canvas has actually rendered frames. */
export async function waitForScene(page: Page): Promise<void> {
  const canvas = page.getByTestId('world-canvas')
  await expect(canvas).toBeVisible({ timeout: 30_000 })
  await page.waitForFunction(
    () => {
      const element = document.querySelector('canvas[data-testid="world-canvas"]')
      if (!(element instanceof HTMLCanvasElement)) return false
      return element.width > 0 && element.height > 0
    },
    undefined,
    { timeout: 30_000 },
  )
}

/**
 * Assert the canvas is not blank.
 *
 * A WebGL canvas that failed to render leaves the framebuffer transparent or
 * uniformly black; sampling real pixels catches that.
 */
export async function expectCanvasNotBlank(page: Page): Promise<void> {
  const result = await page.evaluate(() => {
    const element = document.querySelector('canvas[data-testid="world-canvas"]')
    if (!(element instanceof HTMLCanvasElement)) return { ok: false, reason: 'no canvas' }

    const copy = document.createElement('canvas')
    copy.width = element.width
    copy.height = element.height
    const context = copy.getContext('2d')
    if (!context) return { ok: false, reason: 'no 2d context' }

    context.drawImage(element, 0, 0)
    const { data } = context.getImageData(0, 0, copy.width, copy.height)

    const colours = new Set<string>()
    let opaquePixels = 0

    for (let index = 0; index < data.length; index += 4 * 97) {
      const alpha = data[index + 3] ?? 0
      if (alpha < 8) continue
      opaquePixels += 1
      colours.add(
        `${(data[index] ?? 0) >> 4},${(data[index + 1] ?? 0) >> 4},${(data[index + 2] ?? 0) >> 4}`,
      )
    }

    return {
      ok: opaquePixels > 0 && colours.size > 8,
      reason: '',
      opaquePixels,
      colours: colours.size,
    }
  })

  expect(result.ok, `Canvas appears blank (${JSON.stringify(result)})`).toBe(true)
}

/** Read the persisted discovery list from localStorage. */
export async function readStoredProgress(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    try {
      const raw = window.localStorage.getItem('tinyworld:progress:v1')
      if (!raw) return []
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null) return []
      const discoveries = (parsed as { discoveries?: unknown }).discoveries
      if (!Array.isArray(discoveries)) return []
      return discoveries
        .map((entry) =>
          typeof entry === 'object' && entry !== null ? (entry as { id?: unknown }).id : undefined,
        )
        .filter((id): id is string => typeof id === 'string')
    } catch {
      return []
    }
  })
}

/**
 * Open the discovery journal.
 * The mobile layout exposes an icon button with an accessible name; the desktop
 * layout exposes a "Journal" button in the bottom control bar.
 */
export async function openJournal(page: Page): Promise<void> {
  const mobileButton = page.getByRole('button', { name: 'Open the discovery journal' })

  if (await mobileButton.isVisible()) {
    await mobileButton.click()
  } else {
    await page.getByRole('button', { name: 'Journal' }).click()
  }

  await expect(page.getByRole('dialog', { name: 'Discovery journal' })).toBeVisible()
}

/** Click the first landmark action in the object directory. */
export async function discoverFirstLandmark(directory: Locator): Promise<string> {
  const actionButton = directory
    .getByRole('button', {
      name: /climb|knock|turn|look|read|light|water|stoke|drink/i,
    })
    .first()

  const label = ((await actionButton.textContent()) ?? '').trim()
  await actionButton.click()
  return label
}
