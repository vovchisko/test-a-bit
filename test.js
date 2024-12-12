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
])

console.log('\nRUNNER-AUTO:')
await auto_runner('./tests', { timeout: 1000 })

log_results()
flush_results()

console.log('\nRUNNER TIMEOUT=0 (all timeouts):')
await runner([
  { script: './tests/success.js', timeout: 0 },
  { script: './tests/fail.js', timeout: 0 },
])

console.log('\nRUNNER: (silent=false) - show logs and stacktraces, but keep running')
await runner([
  { script: './tests/success.js', timeout: 1000 },
  { script: './tests/callback-errors.js', timeout: 1000 },
  { script: './tests/success.js', timeout: 1000 },
], { silent: false })

console.log('\nNOTE: MANY TESTS FAILS INTENTIONALLY!')

console.warn('\nATTENTION! NEXT TEST WILL BREAK COMPLETELY!')

console.log('\nRUNNER: (hard_break=true) should break with stacktrace on callback error (includes silent=false)')
await runner([
  { script: './tests/success.js', timeout: 1000 },
  { script: './tests/callback-errors.js', timeout: 1000 },
  { script: './tests/success.js', timeout: 1000 },
], { hard_break: true })

