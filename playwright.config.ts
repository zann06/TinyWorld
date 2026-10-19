import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration.
 *
 * TinyWorld renders through WebGL 2. Headless Chromium supports WebGL via
 * SwiftShader, so the 3D scene is exercised for real in CI rather than being
 * stubbed out.
 */
const PORT = Number(process.env['PLAYWRIGHT_PORT'] ?? 4173)
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  // SwiftShader renders WebGL entirely on the CPU. Running several browsers in
  // parallel starves the machine and causes launch timeouts, so the suite runs
  // serially by default. Raise it deliberately with PLAYWRIGHT_WORKERS.
  workers: Number(process.env['PLAYWRIGHT_WORKERS'] ?? 1),
  reporter: process.env['CI']
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  // Generous: headless SwiftShader renders WebGL on the CPU, so first paint
  // and interactions are far slower than on real hardware.
  timeout: 120_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        launchOptions: {
          args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
        },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 7'],
        // Touch is enabled so the mobile control layer is exercised.
        launchOptions: {
          args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
        },
      },
    },
  ],

  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
})
