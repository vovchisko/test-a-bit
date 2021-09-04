import { runner } from './src/runner.js'

runner([
  { script: './tests/success.js' },
  { script: './tests/fail.js' },
  { script: './tests/timeout.js', timeout: 200 },
  { script: './tests/random.js' },
  { script: './tests/promise-rejection.js' },
]).then(() => console.log('bye'))

