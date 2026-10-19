/**
 * Namespaced, defensive localStorage wrapper.
 *
 * Every read is validated by the caller; a corrupt or hostile payload must never
 * crash the application or leak stale values into state. All access is guarded so
 * that private-mode browsers, disabled storage and quota errors degrade to an
 * in-memory fallback instead of throwing.
 */

const NAMESPACE = 'tinyworld'

export const STORAGE_KEYS = {
  settings: `${NAMESPACE}:settings:v1`,
  progress: `${NAMESPACE}:progress:v1`,
  session: `${NAMESPACE}:session:v1`,
  onboarding: `${NAMESPACE}:onboarding:v1`,
} as const

/** In-memory fallback used when localStorage is unavailable or throws. */
const memoryFallback = new Map<string, string>()

/** Returns true when a real, writable localStorage is available. */
export function isStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false
    const probe = `${NAMESPACE}:__probe__`
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

/**
 * Read and JSON-parse a key. Returns `fallback` when the value is missing,
 * unparseable, or when storage access itself throws.
 */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw =
      typeof window !== 'undefined' && window.localStorage
        ? (window.localStorage.getItem(key) ?? memoryFallback.get(key) ?? null)
        : (memoryFallback.get(key) ?? null)

    if (raw === null) return fallback

    const parsed: unknown = JSON.parse(raw)
    // Only plain objects are valid payloads; scalars and arrays are rejected.
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return fallback
    return parsed as T
  } catch {
    return fallback
  }
}

/** Serialise and persist a value. Returns false if persistence failed. */
export function writeJson(key: string, value: unknown): boolean {
  let serialised: string
  try {
    serialised = JSON.stringify(value)
  } catch {
    return false
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, serialised)
      memoryFallback.delete(key)
      return true
    }
    memoryFallback.set(key, serialised)
    return false
  } catch {
    // Quota exceeded or storage blocked mid-session: fall back to memory so the
    // current session keeps working even though it will not survive a refresh.
    memoryFallback.set(key, serialised)
    return false
  }
}

/**
 * Read a boolean flag.
 *
 * `readJson` deliberately accepts object payloads only, so simple flags need
 * their own reader rather than being smuggled through it.
 */
export function readFlag(key: string): boolean {
  try {
    const raw =
      typeof window !== 'undefined' && window.localStorage
        ? (window.localStorage.getItem(key) ?? memoryFallback.get(key) ?? null)
        : (memoryFallback.get(key) ?? null)

    return raw === 'true'
  } catch {
    return false
  }
}

/** Persist a boolean flag. */
export function writeFlag(key: string, value: boolean): boolean {
  return writeJson(key, value === true)
}

/** Remove a key from both real storage and the memory fallback. */
export function removeKey(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key)
    }
  } catch {
    /* ignore — storage may be entirely unavailable */
  }
  memoryFallback.delete(key)
}

/** Remove every TinyWorld key. Used by the reset-progress action. */
export function clearJson(): void {
  for (const key of Object.values(STORAGE_KEYS)) {
    removeKey(key)
  }
}

/** Clears the in-memory fallback. Exposed for tests. */
export function clearMemoryFallback(): void {
  memoryFallback.clear()
}
