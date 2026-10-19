import { describe, expect, it } from 'vitest'

/**
 * Guards against UTF-8 text being double-encoded: a UTF-8 byte run decoded as
 * CP1252 and written back out as UTF-8. Em dashes turn into `â€”`, middle
 * dots into `Ã‚Â·`, and a multiplication sign into `âœ•`. It renders as garbage
 * in the UI and never fails a type check, so it is worth pinning here.
 *
 * Files are read through Vite's `?raw` import rather than `node:fs` so the
 * browser-facing tsconfig needs no Node types.
 */
const MOJIBAKE: readonly { label: string; sequence: string }[] = [
  { label: 'em dash', sequence: 'â€”' },
  { label: 'en dash', sequence: 'â€“' },
  { label: 'left single quote', sequence: 'â€˜' },
  { label: 'right single quote', sequence: 'â€™' },
  { label: 'left double quote', sequence: 'â€œ' },
  { label: 'right double quote', sequence: 'â€' },
  { label: 'bullet', sequence: 'â€¢' },
  { label: 'ellipsis', sequence: 'â€¦' },
  { label: 'multiplication sign', sequence: 'âœ•' },
  { label: 'right arrow', sequence: 'â†’' },
  { label: 'degree sign', sequence: 'â°' },
  { label: 'minus sign', sequence: 'âˆ’' },
  { label: 'em space', sequence: 'â€‚' },
  { label: 'double-encoded middle dot', sequence: 'Ã‚Â·' },
  { label: 'double-encoded ampersand', sequence: 'Ã‚Â¬' },
  // Emitted by the UTF-8 decoder when a byte run is not valid UTF-8 at all.
  { label: 'replacement character', sequence: '�' },
]

const SOURCE_FILES: Record<string, string> = import.meta.glob<string>(
  ['../../src/**/*.{ts,tsx,css}', '../../tests/**/*.{ts,tsx}', '../../docs/**/*.md', '../../*.md'],
  { query: '?raw', import: 'default', eager: true },
)

/** This file carries the sequences as fixtures, so it exempts itself. */
const SELF = '../../tests/unit/encoding.test.ts'

const SCANNED = Object.entries(SOURCE_FILES)
  .filter(([path]) => path !== SELF)
  .map(([path, text]) => ({ path, text }))

describe('source encoding', () => {
  it('scans the source, tests and docs', () => {
    expect(SCANNED.length).toBeGreaterThan(30)
    expect(SCANNED.some((file) => file.path.includes('ObjectDirectory'))).toBe(true)
  })

  it('decodes every file as valid UTF-8', () => {
    const invalid = SCANNED.filter((file) => file.text.includes('�')).map((file) => file.path)
    expect(invalid).toEqual([])
  })

  it.each(MOJIBAKE)('has no double-encoded $label', ({ sequence }) => {
    const offenders = SCANNED.filter((file) => file.text.includes(sequence)).map(
      (file) => file.path,
    )
    expect(offenders).toEqual([])
  })
})
