import { auto_runner, flush_results, log_results, runner, test } from './src/runner.js'

console.log('\nSINGLE TEST')
await test('./tests/success.js', { timeout: 1000 })

log_results()
flush_results()


console.log('\nRUNNER:')
await runner([
  { script: './tests/success.js' },
  { script: './tests/fail.js' },
  { script: './tests/timeout.js', timeout: 1000 },
  { script: './tests/random.js' },
  { script: './tests/async-resolve.js' },
  { script: './tests/async-reject.js', silent: true },
  { script: './tests/throw.js' },
  { script: './tests/non-existing-script.js', silent: true },
], { silent: false })

console.log('\nRUNNER-AUTO:')
await auto_runner('./tests', { timeout: 512 })


console.log('\nRUNNER TIMEOUT=0 (all timeouts):')
await runner([
  { script: './tests/success.js', timeout: 0 },
  { script: './tests/fail.js', timeout: 0 },
])

log_results()


console.log('NOTE: MANY TESTS FAILS INTENTIONALLY!')
