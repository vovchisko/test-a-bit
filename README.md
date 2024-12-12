# test-a-bit

Zero-dependency light weight testing & benchmarking tool for node-js.

## Features

- ✅ It's really simple.
- ✅ Individual test isolation
- ✅ Test startup and execution time in vacuum
- ✅ Actual stacktraces
- ✅ Zero dependencies

## Why?

For non-conventional testing, of course.

## Installation

```bash
npm i test-a-bit --save-dev
```

## Writing Tests

Each test file should use `execute` function to define a single test:

```javascript
import { execute } from 'test-a-bit'

// One execute per test file
execute('my test', (success, fail) => {
  // Your test logic here
  if (someCondition) {
    success('test passed!') // Resolves test immediately
  } else {
    fail('test failed!')    // Resolves test immediately
  }
})

// Async example
execute('async test', async (success, fail) => {
  try {
    const result = await someOperation()
    success('all good')  // Resolves test
  } catch (err) {
    fail(err.message)    // Resolves test with failure
  }
})
```

## Running Tests

There are several ways to run your tests:

### Direct Node Execution

Run a single test file directly:
```bash
node tests/my-test.js
```

### Test Runner

Run multiple test files with specific options:
```javascript
import { runner } from 'test-a-bit'

await runner([
  { script: './tests/first.js' },
  { script: './tests/second.js', timeout: 1000 },
  { script: './tests/debug.js', silent: false }, // show console output
])
```

### Auto-Discovery

Automatically find and run all tests in a directory:
```javascript
import { auto_runner } from 'test-a-bit'

await auto_runner('./tests/', { timeout: 1000 })
```

## Advanced Features

### Output Control

Control console output visibility:
```javascript
// Global silent mode (default: true)
await runner(tests, { silent: true })

// Per-test silent mode
await runner([
  { script: './test1.js', silent: false }, // show output
  { script: './test2.js' }, // inherit global silent setting
])
```

### Hard Break Mode

Stop execution immediately when a test fails:
```javascript
await runner([
  { script: './test1.js' },
  { script: './test2.js', hard_break: true }, // break if this fails
  { script: './test3.js' }, // won't run if test2 fails
], { hard_break: false }) // global setting
```

### Timeout Control

```javascript
await runner([
  { script: './quick.js', timeout: 100 },
  { script: './slow.js', timeout: 5000 },
  { script: './infinite.js', timeout: -1 }, // no timeout
])
```

## API Reference

### `execute(name, testFn, [precision])`

Defines a single test. Use one per test file.

- `name`: Test name (string)
- `testFn`: Test function `(success, fail) => void`
  - `success(message)`: Call to pass the test (resolves immediately)
  - `fail(message)`: Call to fail the test (resolves immediately)
- `precision`: Time measurement precision ('milli', 'micro', 'nano')

### `runner(tests, options)`

Runs multiple test files in sequence.

- `tests`: Array of test configurations
  - `script`: Path to test file
  - `timeout`: Test timeout in ms (-1 for no timeout)
  - `silent`: Control test's console output
  - `hard_break`: Stop execution on test failure
- `options`:
  - `timeout`: Default timeout (default: 5000ms)
  - `silent`: Control console output (default: true)
  - `hard_break`: Stop on first failure (default: false)
  - `log`: Show summary after completion

### `auto_runner(directory, options)`

Automatically discovers and runs tests in a directory.

- `directory`: Path to test directory
- `options`: Same as runner options

## License

[MIT License](LICENSE) - feel free to use this project commercially.

---
With love ❤️ from Ukraine 🇺🇦
