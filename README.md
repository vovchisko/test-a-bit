# test-a-bit

Zero-dependency light weight testing & benchmarking tool for node-js.

## Features

- ✅ It's really simple.
- ✅ Individual test isolation
- ✅ Test startup and execution time in vacuum

## Why?

For non-conventional testing, of course.

## Installation

```bash
npm i test-a-bit --save-dev
```

## Usage

### Single Test

```javascript
import { execute } from 'test-a-bit'

execute('my test', (success, fail, isRunner) => {
  if (someCondition) {
    success('test passed!')
  } else {
    fail('test failed!')
  }
})
```

### Running Multiple Tests

```javascript
import { runner } from 'test-a-bit'

await runner([
  { script: './tests/success.js' },
  { script: './tests/fail.js' },
  { script: './tests/timeout.js', timeout: 200 },
  { script: './tests/random.js', timeout: 200 },
], {
  timeout: 1000, // default timeout in milliseconds
})
```

### Auto-Discovery Runner

```javascript
import { auto_runner } from 'test-a-bit'

await auto_runner('./tests/', { timeout: 1000 })
```

### Debugging Tests

When debugging tests, you can:

1. Run a single test with output:
```javascript
// test-debug.js
execute('debug test', (success, fail) => {
  console.log('Debug value:', someValue)
  someAsyncOperation()
    .then(result => {
      console.log('Operation result:', result)
      success('all good')
    })
    .catch(err => {
      console.error('Failed:', err)
      fail(err.message)
    })
})
```

2. Enable output for specific tests in a suite:
```javascript
await runner([
  { script: './tests/normal.js' },
  { script: './tests/debug-this.js', silent: false }, // only this test shows output
  { script: './tests/also-debug.js', silent: false },
], { silent: true })
```

3. Temporarily enable all output:
```javascript
// Show all console output while debugging
await auto_runner('./tests/', { silent: false })
```

## API Reference

### `execute(name, testFn, [precision])`

Runs a single test.

- `name`: Test name (string)
- `testFn`: Test function `(success, fail, isRunner) => void`
- `precision`: Time measurement precision ('milli', 'micro', 'nano')

### `runner(tests, options)`

Runs multiple tests in sequence.

- `tests`: Array of test configurations
  - `script`: Path to test file
  - `timeout`: Test timeout in ms (-1 for no timeout)
  - `silent`: Control test's console output
- `options`:
  - `timeout`: Default timeout
  - `silent`: Control console output from all tests
  - `log`: Log results after completion

### `auto_runner(directory, options)`

Automatically discovers and runs tests in a directory.

- `directory`: Path to test directory
- `options`: Same as runner options

## Implementation Details

#### Process Isolation
Each test runs in a separate Node.js process to ensure complete isolation.

#### Silent Mode
Controls whether test console output (console.log, console.error) is shown:
- `silent: true` - Suppresses test output
- `silent: false` - Shows test output
- Can be set globally or per test
- Test results always shown

## TODO

- [ ] Parallel test execution support - Run multiple tests simultaneously for faster execution in multi-core environments

## License

[MIT License](LICENSE) - feel free to use this project commercially.

---
With love ❤️ from Ukraine 🇺🇦
