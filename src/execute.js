import { DEF_PRECISION, FAIL, IN_ERR, precision, SUCCESS, TIME_DIV, TIME_SYM } from './tools.js'

/**
 * Flag indicating if the test is running within a test runner process
 * @type {boolean}
 */
export const IS_RUNNER = Boolean(process.send)

/** How long to wait for stdio to drain before forcing exit */
const FLUSH_DEADLINE_MS = 200

let exit_code = 1
let start_time = 0n
let started = false
let finished = false

const test = {
  name: '',
  note: '',
  delta: 0,
  result: IN_ERR,
  delta_precision: DEF_PRECISION,
  delta_precision_sym: TIME_SYM[DEF_PRECISION],
  done: false,
}

/**
 * Marks the test as successful and completes execution
 * @param {string} [note] - Optional message to describe the success
 */
const success = (note) => {
  exit_code = 0
  test.result = SUCCESS
  complete(note)
}

/**
 * Marks the test as failed and completes execution
 * @param {string} [note] - Optional message to describe the failure
 */
const fail = (note) => {
  exit_code = 1
  test.result = FAIL
  complete(note)
}

/**
 * Completes the test execution and reports results. Safe to call more than
 * once — only the first call counts.
 * @param {string} [note] - Optional message to include in the results
 * @private
 */
const complete = (note) => {
  if (finished) return
  finished = true

  test.note = note === undefined || note === null ? '' : String(note)
  test.delta = started
    ? Number(process.hrtime.bigint() - start_time) / TIME_DIV[test.delta_precision]
    : 0
  test.done = true

  if (IS_RUNNER) {
    process.send(test, () => shutdown())
  } else {
    console.log(test)
    shutdown()
  }
}

/**
 * Terminate once stdio has drained. A bare process.exit() truncates piped
 * output, which is exactly how tests run under the runner (fork + silent).
 * @private
 */
const shutdown = () => {
  process.exitCode = exit_code

  const deadline = Date.now() + FLUSH_DEADLINE_MS
  const wait = () => {
    const pending = process.stdout.writableLength || process.stderr.writableLength
    if (pending && Date.now() < deadline) return setImmediate(wait)
    process.exit(exit_code)
  }

  wait()
}

/**
 * Report a process-level crash as an errored test instead of dying silently
 * @param {string} label
 * @returns {function(*): void}
 * @private
 */
const crash = (label) => (err) => {
  console.error(label, err)
  exit_code = 1
  test.result = IN_ERR
  complete(String(err))
}

process.on('uncaughtException', crash('Uncaught Exception:'))
process.on('unhandledRejection', crash('Unhandled Rejection:'))

/**
 * Executes a test function with timing and result reporting.
 * One call per test file — a second call throws.
 * @param {string} name - The name of the test
 * @param {Function} f - Test function receiving (success, fail, IS_RUNNER)
 * @param {'milli'|'micro'|'nano'} [delta_precision='milli'] - Time measurement precision
 * @example
 * execute('my test', (success, fail, IS_RUNNER) => {
 *   if (someCondition) success('all good')
 *   else fail('something went wrong')
 * })
 */
export function execute (name, f, delta_precision = DEF_PRECISION) {
  if (started) throw new Error('test-a-bit: execute() may only be called once per test file')

  test.name = name || 'Unnamed Test'
  test.delta_precision = precision(delta_precision)
  test.delta_precision_sym = TIME_SYM[test.delta_precision]

  // announce the test to the runner: name/precision are known, result is not
  if (IS_RUNNER) process.send({ ...test, done: false })

  const on_error = (err) => {
    console.error(err)
    exit_code = 1
    test.result = IN_ERR
    complete(String(err))
  }

  started = true
  start_time = process.hrtime.bigint()

  // called directly (not through a promise tick) so sync throws keep a clean stack
  try {
    const r = f(success, fail, IS_RUNNER)
    if (r && typeof r.then === 'function') r.then(undefined, on_error)
  } catch (err) {
    on_error(err)
  }
}
