import { randomUUID } from 'node:crypto'

/** @type {Object<string, number>} Nanoseconds per unit */
export const TIME_DIV = {
  milli: 1e6,
  micro: 1e3,
  nano: 1,
}

/** @type {Object<string, string>} Display symbol per unit */
export const TIME_SYM = {
  milli: 'ms',
  micro: 'μs',
  nano: 'ns',
}

/** Default time precision used when none (or an unknown one) is given */
export const DEF_PRECISION = 'milli'

/**
 * Normalize a precision name, falling back to the default for unknown values
 * @param {string} [unit]
 * @returns {'milli'|'micro'|'nano'}
 */
export function precision (unit) {
  return TIME_DIV[unit] ? unit : DEF_PRECISION
}

/**
 * Generates a unique test identifier
 * @returns {string} UUID v4
 */
export function make_test_id () {
  return randomUUID()
}

/**
 * High-resolution timestamp in the given precision. Only meaningful as a
 * difference between two calls — the origin is arbitrary.
 * @param {'milli'|'micro'|'nano'} [unit='milli'] - Time unit precision
 * @returns {number} Time value in the requested unit
 */
export function microtime (unit) {
  return Number(process.hrtime.bigint()) / TIME_DIV[precision(unit)]
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

/** @type {Set<string>} Every result that is not a pass */
export const FAILED = new Set([FAIL, IN_ERR, NO_RESULT, TIMEOUT])
