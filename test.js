import { auto_runner, reset, runner, test } from './src/runner.js'

reset()
console.log('\nSINGLE TEST')
await test('./tests/success.js', { timeout: 1000 })

reset()
console.log('\nRUNNER:')
await runner([
  { script: './tests/success.js' },
  { script: './tests/fail.js' },
  { script: './tests/timeout.js', timeout: 1000 },
  { script: './tests/random.js' },
  { script: './tests/async-resolve.js' },
  { script: './tests/async-reject.js' },
  { script: './tests/throw.js' },
], { silent: false })


reset()
console.log('\nRUNNER-AUTO:')
await auto_runner('./tests', { timeout: 512 })


reset()
console.log('\nRUNNER-MIXED (all timeouts except one):')
await runner([
  { script: './tests/success.js', timeout: 1000 },
  { script: './tests/fail.js', timeout: 0 },
  { script: './tests/timeout.js', timeout: 0 },
  { script: './tests/random.js', timeout: 0 },
  { script: './tests/async-resolve.js', timeout: 0 },
  { script: './tests/async-reject.js', timeout: 0 },
  { script: './tests/throw.js', timeout: 0 },
])


reset()
console.log('\nRUNNER-AUTO (all timeouts):')
await auto_runner('./tests', { timeout: 0 })
