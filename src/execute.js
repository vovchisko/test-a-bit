import { FAIL, IN_ERR, microtime, SUCCESS } from './tools.js'

/**
 * Flag indicating if the test is running within a test runner process
 * @type {boolean}
 */
export const IS_RUNNER = Boolean(process.send)

let exit_code = 1
let start_time = 0
let time_sym = {
  milli: 'ms',
  micro: 'μs',
  nano: 'ns',
}

const test = {
  name: 'Unnamed Test',
  note: '',
  delta: 0,
  result: IN_ERR,
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
 * Completes the test execution and reports results
 * @param {string} [note] - Optional message to include in the results
 * @private
 */
const complete = (note) => {
  test.note = note
  test.delta = microtime(test.delta_precision) - start_time

  if (IS_RUNNER) {
    process.send(test)
  } else {
    console.log(test)
  }

  process.exit(exit_code)
}

/**
 * Executes a test function with timing and result reporting
 * @param {string} name - The name of the test
 * @param {Function} f - Test function that receives (success, fail, IS_RUNNER) parameters
 * @param {'milli'|'micro'|'nano'} [delta_precision='milli'] - Time measurement precision
 * @example
 * execute('my test', (success, fail, IS_RUNNER) => {
 *   if (someCondition) success('all good')
 *   else fail('something went wrong')
 * })
 */
export function execute (name, f, delta_precision = 'milli') {
  test.name = name
  test.delta_precision = delta_precision
  test.delta_precision_sym = time_sym[delta_precision]

  if (IS_RUNNER)
    process.send(test)

  start_time = microtime(test.delta_precision)

  const ff = async () => {
    await f(success, fail, IS_RUNNER)
  }

  ff().catch(err => {
    test.result = IN_ERR
    complete(String(err))
  })
}

