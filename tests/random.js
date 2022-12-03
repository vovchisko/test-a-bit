import { execute } from '../src/execute.js'

execute('50/50 fail or success', (success, fail, is_runner) => {

  const rnd = Math.random()

  if (!is_runner) console.log(`oh wow! rolled: rnd`)

  rnd > 0.5
      ? success('got lucky!')
      : fail('failed as expected')
})
