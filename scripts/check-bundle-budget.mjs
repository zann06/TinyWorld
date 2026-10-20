import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

/**
 * Bundle budget guard.
 *
 * Runs after `npm run build` and fails when the gzipped output grows past the
 * numbers in BUDGETS. Keeping the entry shell, the scene chunk and Three.js
 * separately capped is the point: a regression in one must not be hidden by a
 * smaller file somewhere else.
 */
const here = dirname(fileURLToPath(import.meta.url))
const assetDir = join(here, '..', 'dist', 'assets')

const KB = 1024

const BUDGETS = [
  { name: 'total JavaScript', match: /\.js$/, max: 460 * KB, group: true },
  { name: 'entry shell (index)', match: /^index-.*\.js$/, max: 165 * KB },
  { name: 'scene chunk (WorldCanvas)', match: /^WorldCanvas-.*\.js$/, max: 95 * KB },
  { name: 'Three.js chunk (three)', match: /^three-.*\.js$/, max: 215 * KB },
  { name: 'CSS', match: /\.css$/, max: 20 * KB, group: true },
  { name: 'largest single JavaScript file', match: /\.js$/, max: 250 * KB, largest: true },
]

function gzippedSize(path) {
  return gzipSync(readFileSync(path)).length
}

function formatKb(bytes) {
  return `${(bytes / KB).toFixed(2)} kB`
}

let files
try {
  files = readdirSync(assetDir)
} catch {
  console.error(`Bundle budget: no build output at ${assetDir}. Run "npm run build" first.`)
  process.exit(1)
}

const bundled = files
  .filter((file) => file.endsWith('.js') || file.endsWith('.css'))
  .map((file) => ({ file, bytes: gzippedSize(join(assetDir, file)) }))

if (bundled.length === 0) {
  console.error('Bundle budget: no JavaScript or CSS assets were found.')
  process.exit(1)
}

const failures = []

for (const budget of BUDGETS) {
  const matched = bundled.filter((entry) => budget.match.test(entry.file))
  if (matched.length === 0) {
    failures.push(`${budget.name}: no matching asset found`)
    continue
  }

  const measured = budget.largest
    ? Math.max(...matched.map((entry) => entry.bytes))
    : budget.group
      ? matched.reduce((total, entry) => total + entry.bytes, 0)
      : (matched[0]?.bytes ?? 0)

  const status = measured <= budget.max ? 'ok  ' : 'FAIL'
  console.log(`${status} ${budget.name}: ${formatKb(measured)} / ${formatKb(budget.max)}`)

  if (measured > budget.max) {
    failures.push(
      `${budget.name} is ${formatKb(measured)}, over the ${formatKb(budget.max)} budget`,
    )
  }
}

console.log('\nAssets:')
for (const entry of [...bundled].sort((a, b) => b.bytes - a.bytes)) {
  console.log(`  ${formatKb(entry.bytes).padStart(9)}  ${entry.file}`)
}

if (failures.length > 0) {
  console.error('\nBundle budget failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('\nBundle budget ok.')
