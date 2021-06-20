import { execute } from '../src/execute.js'

execute('sample fail test', (success, fail, is_runner) => {
  let a = 1
  let b = 2.00001

  if (a + b !== 3) fail('4 is not correct!')
})
