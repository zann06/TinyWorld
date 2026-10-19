import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

/**
 * jsdom does not implement matchMedia. Provide a controllable stub so tests can
 * assert on responsive and reduced-motion behaviour.
 */
let prefersReducedMotion = false
let isCoarsePointer = false

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string) => {
    const reduced = query.includes('prefers-reduced-motion')
    const coarse = query.includes('pointer: coarse')

    return {
      matches: reduced ? prefersReducedMotion : coarse ? isCoarsePointer : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  },
})

/** Test helper: flip the simulated OS-level preferences. */
export function setMediaPreferences(options: {
  reducedMotion?: boolean
  coarsePointer?: boolean
}): void {
  if (options.reducedMotion !== undefined) prefersReducedMotion = options.reducedMotion
  if (options.coarsePointer !== undefined) isCoarsePointer = options.coarsePointer
}

beforeEach(() => {
  window.localStorage.clear()
  prefersReducedMotion = false
  isCoarsePointer = false
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})
