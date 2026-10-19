import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearJson,
  readFlag,
  readJson,
  removeKey,
  writeFlag,
  writeJson,
  STORAGE_KEYS,
} from '@/lib/storage'
import { DEFAULT_SETTINGS, normaliseSettings } from '@/store/settings-defaults'
import { EMPTY_PROGRESS, PROGRESS_VERSION, normaliseProgress } from '@/store/progress-schema'
import { DEFAULT_ISLAND_ID, islandOfObjectId } from '@/data/islands'

/**
 * Temporarily replace a Storage method with one that throws, mirroring a
 * blocked or quota-exceeded browser. Returns a restore function.
 */
function withBrokenStorage(
  method: 'getItem' | 'setItem' | 'removeItem',
  behaviour: () => void,
): () => void {
  const original = Object.getOwnPropertyDescriptor(Storage.prototype, method)
  Object.defineProperty(Storage.prototype, method, {
    configurable: true,
    writable: true,
    value: behaviour,
  })

  return () => {
    if (original) Object.defineProperty(Storage.prototype, method, original)
  }
}

describe('storage helpers', () => {
  it('round-trips a value', () => {
    expect(writeJson('tw:test', { a: 1 })).toBe(true)
    expect(readJson<{ a: number }>('tw:test', { a: 0 })).toEqual({ a: 1 })
  })

  it('returns the fallback for a missing key', () => {
    expect(readJson('tw:absent', 'fallback')).toBe('fallback')
  })

  it('returns the fallback for malformed JSON instead of throwing', () => {
    window.localStorage.setItem('tw:broken', '{not valid json')
    expect(readJson('tw:broken', { ok: true })).toEqual({ ok: true })
  })

  it('returns the fallback for a non-object payload', () => {
    window.localStorage.setItem('tw:scalar', '42')
    expect(readJson('tw:scalar', 'fallback')).toBe('fallback')
    window.localStorage.setItem('tw:array', '[1,2,3]')
    expect(readJson('tw:array', 'fallback')).toBe('fallback')
    window.localStorage.setItem('tw:null', 'null')
    expect(readJson('tw:null', 'fallback')).toBe('fallback')
  })

  it('removes keys', () => {
    writeJson('tw:gone', { a: 1 })
    removeKey('tw:gone')
    expect(readJson('tw:gone', null)).toBeNull()
  })

  it('survives a localStorage that throws on write', () => {
    const restore = withBrokenStorage('setItem', () => {
      throw new Error('QuotaExceededError')
    })

    try {
      // Persistence fails, but the call must not throw and must not lose data
      // for the current session.
      expect(writeJson('tw:quota', { a: 1 })).toBe(false)
      expect(readJson<{ a: number }>('tw:quota', { a: 0 })).toEqual({ a: 1 })
    } finally {
      restore()
    }
  })

  it('survives a localStorage that throws on read', () => {
    const restore = withBrokenStorage('getItem', () => {
      throw new Error('SecurityError')
    })

    try {
      expect(readJson('tw:blocked', 'fallback')).toBe('fallback')
    } finally {
      restore()
    }
  })

  it('clearJson removes every TinyWorld key', () => {
    for (const key of Object.values(STORAGE_KEYS)) writeJson(key, { x: 1 })
    clearJson()
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(readJson(key, null)).toBeNull()
    }
  })
})

describe('boolean flags', () => {
  it('round-trips true and false', () => {
    expect(writeFlag('tw:flag', true)).toBe(true)
    expect(readFlag('tw:flag')).toBe(true)

    writeFlag('tw:flag', false)
    expect(readFlag('tw:flag')).toBe(false)
  })

  it('returns false for a missing flag', () => {
    expect(readFlag('tw:absent')).toBe(false)
  })

  it('returns false for a non-boolean payload', () => {
    window.localStorage.setItem('tw:flag', '{"enabled":true}')
    expect(readFlag('tw:flag')).toBe(false)
  })

  it('survives storage that throws on read', () => {
    const restore = withBrokenStorage('getItem', () => {
      throw new Error('SecurityError')
    })

    try {
      expect(readFlag('tw:flag')).toBe(false)
    } finally {
      restore()
    }
  })
})

describe('normaliseSettings', () => {
  it('returns defaults for null', () => {
    expect(normaliseSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps valid values', () => {
    const input = { quality: 'low', cameraSensitivity: 2, masterVolume: 0.3, muted: true }
    expect(normaliseSettings(input)).toMatchObject(input)
  })

  it('rejects an unknown quality level', () => {
    expect(normaliseSettings({ quality: 'ultra' }).quality).toBe(DEFAULT_SETTINGS.quality)
  })

  it('rejects an unknown time of day', () => {
    expect(normaliseSettings({ timeOfDay: 'dawn' }).timeOfDay).toBe(DEFAULT_SETTINGS.timeOfDay)
  })

  it('clamps out-of-range and non-numeric numbers', () => {
    expect(normaliseSettings({ cameraSensitivity: 999 }).cameraSensitivity).toBe(3)
    expect(normaliseSettings({ cameraSensitivity: -5 }).cameraSensitivity).toBe(0.2)
    expect(normaliseSettings({ masterVolume: 4 }).masterVolume).toBe(1)
    expect(normaliseSettings({ masterVolume: -1 }).masterVolume).toBe(0)
    expect(normaliseSettings({ masterVolume: Number.NaN }).masterVolume).toBe(0)
    expect(normaliseSettings({ cameraSensitivity: 'fast' }).cameraSensitivity).toBe(
      DEFAULT_SETTINGS.cameraSensitivity,
    )
  })

  it('ignores wrongly typed booleans', () => {
    const result = normaliseSettings({ muted: 'yes', showHud: 1 })
    expect(result.muted).toBe(DEFAULT_SETTINGS.muted)
    expect(result.showHud).toBe(DEFAULT_SETTINGS.showHud)
  })

  it('recovers a valid value when only one key is corrupt', () => {
    const result = normaliseSettings({ quality: 'nonsense', masterVolume: 0.9 })
    expect(result.quality).toBe(DEFAULT_SETTINGS.quality)
    expect(result.masterVolume).toBe(0.9)
  })
})

describe('normaliseProgress', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns empty progress for null', () => {
    expect(normaliseProgress(null, islandOfObjectId)).toEqual(EMPTY_PROGRESS)
  })

  it('migrates a version 1 save onto the default island', () => {
    const result = normaliseProgress(
      { version: 1, discoveries: [{ id: 'lighthouse', discoveredAt: 123 }] },
      islandOfObjectId,
    )

    expect(result.version).toBe(PROGRESS_VERSION)
    expect(result.islands[DEFAULT_ISLAND_ID]).toEqual([{ id: 'lighthouse', discoveredAt: 123 }])
  })

  it('buckets a version 1 save by the island that owns each object', () => {
    const result = normaliseProgress(
      {
        discoveries: [
          { id: 'lighthouse', discoveredAt: 1 },
          { id: 'wreck', discoveredAt: 2 },
        ],
      },
      islandOfObjectId,
    )

    expect(result.islands['greenhaven']?.map((entry) => entry.id)).toEqual(['lighthouse'])
    expect(result.islands['cairnmoor']?.map((entry) => entry.id)).toEqual(['wreck'])
  })

  it('keeps valid version 2 discoveries', () => {
    const result = normaliseProgress(
      { version: PROGRESS_VERSION, islands: { cairnmoor: [{ id: 'wreck', discoveredAt: 5 }] } },
      islandOfObjectId,
    )
    expect(result.islands['cairnmoor']).toEqual([{ id: 'wreck', discoveredAt: 5 }])
  })

  it('drops a version 2 entry filed under the wrong island', () => {
    const result = normaliseProgress(
      {
        version: PROGRESS_VERSION,
        islands: { cairnmoor: [{ id: 'lighthouse', discoveredAt: 5 }] },
      },
      islandOfObjectId,
    )
    expect(result.islands['cairnmoor']).toBeUndefined()
  })

  it('drops discoveries for objects that no longer exist', () => {
    const result = normaliseProgress(
      { discoveries: [{ id: 'removed-landmark', discoveredAt: 1 }] },
      islandOfObjectId,
    )
    expect(result.islands).toEqual({})
  })

  it('de-duplicates repeated discoveries', () => {
    const result = normaliseProgress(
      {
        discoveries: [
          { id: 'cottage', discoveredAt: 2 },
          { id: 'cottage', discoveredAt: 9 },
        ],
      },
      islandOfObjectId,
    )
    const entries = result.islands['greenhaven'] ?? []
    expect(entries).toHaveLength(1)
    expect(entries[0]?.discoveredAt).toBe(2)
  })

  it('repairs invalid timestamps', () => {
    const result = normaliseProgress(
      { discoveries: [{ id: 'cottage', discoveredAt: 'yesterday' }] },
      islandOfObjectId,
    )
    expect(result.islands['greenhaven']?.[0]?.discoveredAt).toBeGreaterThan(0)
  })

  it('ignores a non-array discoveries field', () => {
    expect(normaliseProgress({ discoveries: 'lots' }, islandOfObjectId).islands).toEqual({})
  })

  it('ignores a non-object islands field', () => {
    expect(
      normaliseProgress({ version: PROGRESS_VERSION, islands: 'lots' }, islandOfObjectId).islands,
    ).toEqual({})
  })

  it('skips malformed entries', () => {
    const result = normaliseProgress(
      { discoveries: [null, 'cottage', { id: 'dock', discoveredAt: 5 }] },
      islandOfObjectId,
    )
    expect(result.islands['greenhaven']).toEqual([{ id: 'dock', discoveredAt: 5 }])
  })

  it('always reports the current schema version', () => {
    expect(normaliseProgress({ version: 99 }, islandOfObjectId).version).toBe(PROGRESS_VERSION)
  })
})
