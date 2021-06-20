import { execute } from '../src/execute.js'

execute('do nothing', (success, fail, is_runner) => {
  // literally nothing
  setTimeout(() => console.log('nice... to meet... you.'), 5000)
})
