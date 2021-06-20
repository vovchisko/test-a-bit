import { execute } from '../src/execute.js'

execute('sample fail test', (success, fail, is_runner) => {

  const rnd = Math.random()

  if (!is_runner) console.log(`oh wow! rolled: rnd`)

  success > 0.5
      ? success('got lucky!')
      : fail('oh, no!')
})
