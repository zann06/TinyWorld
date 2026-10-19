import { chromium } from '@playwright/test'

/**
 * Captures the release screenshots used in the README.
 *
 * Usage: node scripts/capture-screenshots.mjs
 * Requires `npm run preview` to be serving the production build.
 */
const url = process.env.SCREENSHOT_URL ?? 'http://127.0.0.1:4173/'

/** Screenshots are not byte-identical between runs, so only regenerate the ones you changed. */
const only = process.env.SCREENSHOT_ONLY

const shots = [
  {
    name: 'island-exploration',
    island: 'greenhaven',
    width: 1600,
    height: 900,
    time: 'day',
    camera: 'default',
  },
  {
    name: 'island-wide',
    island: 'greenhaven',
    width: 1600,
    height: 900,
    time: 'day',
    camera: 'wide',
  },
  {
    name: 'island-dusk',
    island: 'greenhaven',
    width: 1600,
    height: 900,
    time: 'dusk',
    camera: 'wide',
  },
  {
    name: 'island-night',
    island: 'greenhaven',
    width: 1600,
    height: 900,
    time: 'night',
    camera: 'default',
  },
  {
    name: 'cairnmoor-wide',
    island: 'cairnmoor',
    width: 1600,
    height: 900,
    time: 'day',
    camera: 'wide',
  },
  {
    name: 'cairnmoor-dusk',
    island: 'cairnmoor',
    width: 1600,
    height: 900,
    time: 'dusk',
    camera: 'wide',
  },
  {
    name: 'mobile-exploration',
    island: 'greenhaven',
    width: 412,
    height: 892,
    time: 'day',
    camera: 'default',
    mobile: true,
  },
]

/** Version 2 progress, keyed by island, so both islands show a real count. */
const progress = {
  version: 2,
  islands: {
    greenhaven: [
      { id: 'lighthouse', discoveredAt: 1 },
      { id: 'cottage', discoveredAt: 2 },
      { id: 'dock', discoveredAt: 3 },
      { id: 'boardwalk', discoveredAt: 4 },
    ],
    cairnmoor: [
      { id: 'wreck', discoveredAt: 5 },
      { id: 'cairn', discoveredAt: 6 },
      { id: 'boathouse', discoveredAt: 7 },
    ],
  },
}

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
})

for (const shot of shots) {
  if (only && !shot.name.startsWith(only)) continue

  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    isMobile: Boolean(shot.mobile),
    hasTouch: Boolean(shot.mobile),
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()

  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.addInitScript(
    ({ timeOfDay, stored }) => {
      window.localStorage.setItem('tinyworld:onboarding:v1', 'true')
      window.localStorage.setItem(
        'tinyworld:settings:v1',
        JSON.stringify({ quality: 'high', timeOfDay, showHud: true }),
      )
      window.localStorage.setItem('tinyworld:progress:v1', JSON.stringify(stored))
    },
    { timeOfDay: shot.time, stored: progress },
  )

  await page.goto(url, { waitUntil: 'load' })
  await page.getByTestId('world-canvas').waitFor({ state: 'visible', timeout: 60_000 })
  await page.waitForTimeout(2500)

  if (shot.island !== 'greenhaven') {
    await page.getByTestId('island-switcher').click()
    await page.getByRole('option', { name: new RegExp(shot.island, 'i') }).click()
    await page.getByTestId('world-canvas').waitFor({ state: 'visible', timeout: 60_000 })
    await page.waitForTimeout(2500)
  }

  if (shot.camera === 'wide') {
    const box = await page.getByTestId('world-canvas').boundingBox()
    await page.mouse.move(
      (box?.x ?? 0) + (box?.width ?? 0) / 2,
      (box?.y ?? 0) + (box?.height ?? 0) / 2,
    )
    for (let i = 0; i < 20; i += 1) {
      await page.mouse.wheel(0, 220)
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(2000)
  }

  await page.screenshot({ path: `docs/screenshots/${shot.name}.png` })
  console.log(
    `wrote docs/screenshots/${shot.name}.png${errors.length ? ` (errors: ${errors.join(' | ')})` : ''}`,
  )

  await context.close()
}

await browser.close()
