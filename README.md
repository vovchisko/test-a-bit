# test-a-bit

> The package is no longer supported.
> Node.js has it all by now, so this package no longer needed.

Zero-dependency light weight testing & benchmarking tool for node-js.

## Features

- ✅ It's really simple.
- ✅ Individual test isolation — one process per test
- ✅ Test startup and execution time in vacuum
- ✅ Actual stacktraces
- ✅ Zero dependencies

## Why?

For non-conventional testing, of course.

## Installation

```bash
npm i test-a-bit --save-dev
```

Requires **Node.js 20+**.

## Writing Tests

Each test file should use `execute` to define a single test:

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
```

```javascript
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

Anything the test throws — sync, async, or an unhandled rejection — is reported
as an `error` result with its stacktrace intact.

## Running Tests

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

Tests always run **sequentially**, one process at a time — that's the point.
Each test gets a clean process and a timing measurement that isn't polluted by
whatever else is running.

### Auto-Discovery

Automatically find and run all tests in a directory:
```javascript
import { auto_runner } from 'test-a-bit'

await auto_runner('./tests/', { timeout: 1000 })
```

## Advanced Features

### Exit Codes

`runner` and `auto_runner` set `process.exitCode = 1` when any test doesn't
pass, so CI picks it up. Opt out when a run is expected to fail:

```javascript
await runner(tests, { set_exit_code: false })
```

`test()` never touches the exit code — it just returns the result record.

### Output Control

```javascript
// Global silent mode (default: true)
await runner(tests, { silent: true })

// Per-test silent mode
await runner([
  { script: './test1.js', silent: false }, // show this test's output
  { script: './test2.js' },                // inherit global silent setting
])
```

Captured stdout/stderr is printed for any non-passing test when `silent: false`
or `hard_break` is set.

### Hard Break Mode

Do you want to see all the failures, or just the first one? `hard_break` stops
the run at the first test that doesn't pass — fail, error, timeout, whatever.

```javascript
await runner([
  { script: './test1.js' },
  { script: './test2.js', hard_break: true }, // break if this one doesn't pass
  { script: './test3.js' },                   // won't run if test2 fails
], { hard_break: false }) // global setting
```

The runner stops the loop and returns normally — it prints the summary and sets
the exit code, it does not kill your process mid-flight.

### Timeout Control

```javascript
await runner([
  { script: './quick.js', timeout: 100 },
  { script: './slow.js', timeout: 5000 },
  { script: './infinite.js', timeout: -1 }, // no timeout
])
```

A test killed by its timeout is reported as `timeout`, never as `error`.

### Filtering Discovered Files

```javascript
await auto_runner('./tests', {
  ext: ['.js', '.mjs'],           // default
  ignore: ['helpers.js', /^_/],   // names or patterns to skip
})
```

## API Reference

### `execute(name, testFn, [precision])`

Defines a single test. One per test file — a second call throws.

- `name`: Test name (string)
- `testFn`: Test function `(success, fail, IS_RUNNER) => void | Promise`
  - `success(note)`: Pass the test (resolves immediately)
  - `fail(note)`: Fail the test (resolves immediately)
  - `IS_RUNNER`: `true` when running under a runner, `false` standalone
- `precision`: Time measurement precision — `'milli'` (default), `'micro'`, `'nano'`

### `test(script, options)`

Runs one test file in its own process.

- `script`: Path to the test file
- `options`: `timeout` (5000), `silent` (true), `hard_break` (false)
- returns: `Promise<Object>` — the result record

### `runner(tests, options)`

Runs multiple test files in sequence.

- `tests`: Array of paths, or of test configurations
  - `script`: Path to test file
  - `timeout`: Test timeout in ms (-1 for no timeout)
  - `silent`: Control this test's console output
  - `hard_break`: Stop the run if this test doesn't pass
- `options`:
  - `timeout`: Default timeout (default: `5000`)
  - `silent`: Default silent mode (default: `true`)
  - `hard_break`: Stop on first non-passing test (default: `false`)
  - `log`: Print the summary after completion (default: `false`)
  - `set_exit_code`: Set `process.exitCode` on failure (default: `true`)
- returns: `Promise<Map>` — results **of this run** only

### `auto_runner(directory, options)`

Discovers and runs test files in a directory. Same options as `runner`, plus
`ext` and `ignore`.

### `get_summary([map])`

Tallies a result map (defaults to the global one).

```javascript
const sum = get_summary(await runner(tests))
// { total, success, fail, error, timeout, unknown, failed }
```

### `log_results([map])` / `flush_results()` / `results`

`results` is a global Map accumulating every result in the process.
`log_results` prints a summary of it (or of a map you pass),
`flush_results` clears it.

### `pick_files(dir, { ext, ignore })`

Returns sorted absolute paths of test files in a directory.

### `microtime([unit])`

High-resolution timestamp in `'milli'` (default), `'micro'` or `'nano'`.
Only meaningful as a difference between two calls.

## License

[MIT License](LICENSE) - feel free to use this project commercially.

---
With love ❤️ from Ukraine 🇺🇦
