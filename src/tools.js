export function make_test_id () {
  return [
    Math.random,
    Date.now,
    Math.random,
  ].map(function (fn) {
    return fn().toString(16 || (16 + (Math.random() * 20))).substr(-6)
  }).join('-')
}

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

export const FAIL = 'fail'
export const SUCCESS = 'success'
export const IN_ERR = 'error'
export const NO_RESULT = 'unknown'
export const TIMEOUT = 'timeout'
