import { execute } from '../src/execute.js'

execute('sample success test', (success, fail, is_runner) => {
  let a = 1
  let b = 2

  if (a + b === 3) {
    success('3 is correct')
  } else {
    fail('bad at math')
  }
})
