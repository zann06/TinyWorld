import { test as base, expect } from '@playwright/test'

/**
 * End-to-end tests run the scene at the lowest quality preset.
 *
 * Headless WebGL is software-rendered on the CPU, and the high preset spends
 * most of its frame budget on shadows and device-pixel-ratio scaling that no
 * test asserts. Behaviour is identical at every preset, but the difference in
 * wall-clock time is large enough to decide whether the suite fits its budget.
 *
 * The preset is written before the app boots, so hydration picks it up. Other
 * persisted settings are preserved: a test that switches to Night still reloads
 * into Night, because only `quality` is overridden.
 */
export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.addInitScript(() => {
      const key = 'tinyworld:settings:v1'
      try {
        const stored = window.localStorage.getItem(key)
        const parsed: unknown = stored ? JSON.parse(stored) : {}
        const base = typeof parsed === 'object' && parsed !== null ? parsed : {}
        window.localStorage.setItem(key, JSON.stringify({ ...base, quality: 'low' }))
      } catch {
        // Storage can be unavailable; the app already handles that case.
      }
    })

    await provide(page)
  },
})

export { expect }
