import { chromium } from '@playwright/test'

/**
 * Captures the release screenshots used in the README.
 *
 * Usage: node scripts/capture-screenshots.mjs
 * Requires `npm run preview` to be serving the production build.
 */
const url = process.env.SCREENSHOT_URL ?? 'http://127.0.0.1:4173/'

const shots = [
  { name: 'island-exploration', width: 1600, height: 900, time: 'day', camera: 'default' },
  { name: 'island-wide', width: 1600, height: 900, time: 'day', camera: 'wide' },
  { name: 'island-dusk', width: 1600, height: 900, time: 'dusk', camera: 'wide' },
  { name: 'island-night', width: 1600, height: 900, time: 'night', camera: 'default' },
  {
    name: 'mobile-exploration',
    width: 412,
    height: 892,
    time: 'day',
    camera: 'default',
    mobile: true,
  },
]

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
})

for (const shot of shots) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    isMobile: Boolean(shot.mobile),
    hasTouch: Boolean(shot.mobile),
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()

  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.addInitScript((timeOfDay) => {
    window.localStorage.setItem('tinyworld:onboarding:v1', 'true')
    window.localStorage.setItem(
      'tinyworld:settings:v1',
      JSON.stringify({ quality: 'high', timeOfDay, showHud: true }),
    )
    window.localStorage.setItem(
      'tinyworld:progress:v1',
      JSON.stringify({
        version: 1,
        discoveries: [
          { id: 'lighthouse', discoveredAt: 1 },
          { id: 'cottage', discoveredAt: 2 },
          { id: 'dock', discoveredAt: 3 },
          { id: 'boardwalk', discoveredAt: 4 },
        ],
      }),
    )
  }, shot.time)

  await page.goto(url, { waitUntil: 'load' })
  await page.getByTestId('world-canvas').waitFor({ state: 'visible', timeout: 60_000 })
  await page.waitForTimeout(2500)

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
