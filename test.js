import { auto_runner, flush_results, get_summary, log_results, runner, test } from './src/runner.js'

// This suite intentionally runs failing tests — that IS the thing being tested.
// So instead of trusting exit codes, every section asserts its own tally and
// the exit code comes from those assertions at the very end.

const OPT = { set_exit_code: false }

let checks_failed = 0

/**
 * Assert a condition about a section's outcome
 * @param {string} label - What is being checked
 * @param {boolean} ok - Result of the check
 * @param {string} [detail] - Extra context printed on failure
 */
function check (label, ok, detail = '') {
  if (ok) return console.log(`\x1b[36m  ✓\x1b[0m ${ label }`)
  checks_failed++
  console.log(`\x1b[31m  ✗ ${ label }\x1b[0m ${ detail }`)
}

console.log('\nSINGLE TEST')
await test('./tests/success.js', { timeout: 1000 })

log_results()
check('single test passed', get_summary().success === 1)
flush_results()

console.log('\nRUNNER:')
let sum = get_summary(await runner([
  { script: './tests/success.js' },
  { script: './tests/fail.js' },
  { script: './tests/timeout.js', timeout: 1000 },
], OPT))

check('1 success', sum.success === 1, JSON.stringify(sum))
check('1 fail', sum.fail === 1, JSON.stringify(sum))
check('1 timeout — not misreported as error', sum.timeout === 1, JSON.stringify(sum))

console.log('\nRUNNER-AUTO:')
sum = get_summary(await auto_runner('./tests', { timeout: 1000, ...OPT }))

check('8 tests discovered', sum.total === 8, JSON.stringify(sum))
check('3 errors (async-reject, callback-errors, throw)', sum.error === 3, JSON.stringify(sum))
check('1 timeout', sum.timeout === 1, JSON.stringify(sum))
check('4 pass-or-fail (random.js is a coin flip)', sum.success + sum.fail === 4, JSON.stringify(sum))
check('no unknown results', sum.unknown === 0, JSON.stringify(sum))

log_results()
flush_results()

console.log('\nRUNNER TIMEOUT=0 (all timeouts):')
sum = get_summary(await runner([
  { script: './tests/success.js', timeout: 0 },
  { script: './tests/fail.js', timeout: 0 },
], OPT))

check('killed before reporting == timeout, not error', sum.timeout === 2, JSON.stringify(sum))

console.log('\nRUNNER: (silent=false) — show logs and stacktraces, but keep running')
sum = get_summary(await runner([
  { script: './tests/success.js', timeout: 1000 },
  { script: './tests/callback-errors.js', timeout: 1000 },
  { script: './tests/success.js', timeout: 1000 },
], { silent: false, ...OPT }))

check('kept running after the error', sum.total === 3, JSON.stringify(sum))
check('2 success + 1 error', sum.success === 2 && sum.error === 1, JSON.stringify(sum))

console.log('\nRUNNER: (hard_break=true) — stop at the first failure, with stacktrace')
sum = get_summary(await runner([
  { script: './tests/success.js', timeout: 1000 },
  { script: './tests/callback-errors.js', timeout: 1000 },
  { script: './tests/success.js', timeout: 1000 },
], { hard_break: true, ...OPT }))

check('stopped after the error — 3rd test skipped', sum.total === 2, JSON.stringify(sum))
check('1 success + 1 error', sum.success === 1 && sum.error === 1, JSON.stringify(sum))

console.log('\nEXIT CODE')
flush_results()
await runner([{ script: './tests/fail.js' }])
check('a failed run sets process.exitCode = 1', process.exitCode === 1, `got ${ process.exitCode }`)
process.exitCode = 0

flush_results()
await runner([{ script: './tests/success.js' }])
check('a clean run leaves process.exitCode alone', !process.exitCode, `got ${ process.exitCode }`)

console.log(`\nNOTE: individual tests fail on purpose — the ✓/✗ checks above are what matters.`)

if (checks_failed) {
  console.log(`\n\x1b[31m${ checks_failed } self-check(s) failed\x1b[0m\n`)
  process.exitCode = 1
} else {
  console.log(`\n\x1b[36mall self-checks passed\x1b[0m\n`)
  process.exitCode = 0
}
