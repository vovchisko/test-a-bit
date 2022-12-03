import { execute } from '../src/execute.js'

execute('async resolve', async (success, fail, is_runner) => {
  await new Promise((resolve, reject) => setTimeout(() => resolve(), 1))
  success('ok, resolved')
})
