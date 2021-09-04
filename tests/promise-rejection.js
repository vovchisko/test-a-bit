import { execute } from '../src/execute.js'

execute('sample fail test', (success, fail, is_runner) => {
  (async () => {
    new Promise((resolve, reject)=>{
      const x = 'a' * { }
      x = 2
    })
  })()
})
