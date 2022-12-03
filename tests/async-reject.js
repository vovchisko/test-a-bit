import { execute } from '../src/execute.js'

execute('async reject', async (success, fail, is_runner) => {
  await new Promise((resolve, reject) => setTimeout(() => reject('rejected!'), 1))
})
