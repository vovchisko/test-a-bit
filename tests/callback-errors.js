import { execute } from '../src/execute.js'

execute('callback errors', (success, fail, is_runner) => {
  // throws *after* execute() announced the test — the runner must still report an error
  const cfg = null
  success(cfg.missing.deeply)
})
