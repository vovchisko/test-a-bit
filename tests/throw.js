import { execute } from '../src/execute.js'

execute('async: throw error', (success, fail, is_runner) => {
  throw new Error('fok it')
})
