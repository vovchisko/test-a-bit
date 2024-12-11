/**
 * Generates a unique test identifier using random values and timestamp
 * @returns {string} A hyphen-separated string of hexadecimal values
 */
export function make_test_id () {
  return [
    Math.random,
    Date.now,
    Math.random,
  ].map(function (fn) {
    return fn().toString(16 || (16 + (Math.random() * 20))).substr(-6)
  }).join('-')
}

/**
 * Get high-resolution time in specified precision
 * @param {'milli'|'micro'|'nano'} unit - Time unit precision
 * @returns {number} Time value in specified unit
 */
export function microtime (unit) {
  const hrTime = process.hrtime()
  switch (unit) {
    case 'milli':
      return hrTime[0] * 1000 + hrTime[1] / 1000000
    case 'micro':
      return hrTime[0] * 1000000 + hrTime[1] / 1000
    case 'nano':
    default:
      return hrTime[0] * 1000000000 + hrTime[1]
  }
}

/** @type {string} Test result: Test failed */
export const FAIL = 'fail'
/** @type {string} Test result: Test passed */
export const SUCCESS = 'success'
/** @type {string} Test result: Test errored */
export const IN_ERR = 'error'
/** @type {string} Test result: No result received */
export const NO_RESULT = 'unknown'
/** @type {string} Test result: Test timed out */
export const TIMEOUT = 'timeout'
