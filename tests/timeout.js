import { execute } from '../src/execute.js'

execute('timeout fail', (success, fail, is_runner) => {
  setTimeout(() => console.log('nice... to meet... you.'), 15000)
})
