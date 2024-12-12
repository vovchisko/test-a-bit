import child_process                                              from 'child_process'
import { FAIL, IN_ERR, make_test_id, NO_RESULT, SUCCESS, TIMEOUT } from './tools.js'
import fs                                                         from 'fs'
import path                                                       from 'path'

/** @type {Map<string, Object>} Global map storing test results */
export const results = new Map()

const pal_normal = '\x1b[0m'
const pal_fail = '\x1b[33m'
const pal_success = '\x1b[36m' // cyan, actual green = "\x1b[32m"
const pal_dim = '\x1b[2m'
const pal_error = '\x1b[31m'

/** Default timeout in milliseconds */
const DEF_TIMEOUT = 5000
/** Default silent mode setting - changed to true */
const DEF_SILENT = true
/** Default hard break setting */
const DEF_HARD_BREAK = false

/**
 * Run a single test script in a separate process
 * @param {string} script - Path to the test script
 * @param {Object} options - Test options
 * @param {number} [options.timeout=5000] - Timeout in milliseconds (-1 for no timeout)
 * @param {boolean} [options.silent=false] - Suppress console output from test
 * @returns {Promise<void>} Resolves when test completes
 */
export function test (script, { timeout = DEF_TIMEOUT, silent = DEF_SILENT, hard_break = DEF_HARD_BREAK } = {}) {
  return new Promise((resolve, reject) => {

    const curr = {
      uid: make_test_id(),
      name: script,
      note: '',
      timeout,
      script,
      silent,
      result: NO_RESULT,
      delta: 0,
      delta_precision: '-',
      delta_precision_sym: '-',
      start_ms: Date.now(),
      stop_ms: 0,
    }

    let output = '',
        countdown,
        c

    results.set(curr.uid, curr)

    c = child_process.fork(script, { silent: true })

    let output_buffer = []
    let error_buffer = []

    c.stdout?.on('data', (data) => {
      output_buffer.push(data.toString())
    })

    c.stderr?.on('data', (data) => {
      error_buffer.push(data.toString())
    })

    c.on('message', (status) => {
      Object.assign(curr, status)
      curr.fullfilled = true
    })

    // Improve error handling
    c.on('error', (err) => {
      curr.result = IN_ERR
      curr.note = String(err)
      if (!silent) {
        console.error('Process error:', err)
      }
    })

    c.on('exit', (code, err) => {
      curr.stop_ms = Date.now()

      if (code !== 0 && !curr.fullfilled) {
        curr.result = IN_ERR
        curr.note = 'Process terminated with unhandled error'
      }

      // Format the output but don't log it yet
      if (timeout !== -1) {
        clearTimeout(countdown)
      }

      let color = pal_normal

      switch (curr.result) {
        case SUCCESS:
          color = pal_success
          break
        case FAIL:
        case TIMEOUT:
          color = pal_fail
          break
        case IN_ERR:
        case NO_RESULT:
          color = pal_error
          break
      }

      output += `${color}${curr.result}${pal_normal}`.padEnd(16 + color.length, ' ')
      output += (curr.result !== TIMEOUT
        ? `Δt = ${(curr.delta).toFixed(2)}${curr.delta_precision_sym} `
        : `Δt > ${(curr.timeout)}ms `)
        .padEnd(16, '^').replaceAll('^', pal_dim + '.' + pal_normal) + ' '
      output += `(proc: ${curr.stop_ms - curr.start_ms}ms) `.padEnd(18, '^').replaceAll('^', pal_dim + '.' + pal_normal) + ' '
      output += `${curr.name || curr.script} ${pal_dim}>>>${pal_normal} ${curr.note || `${pal_dim}[no message]${pal_normal}`}`

      curr.exit_code = code

      // Always log the test status line first
      console.log(output)

      // Show error output for both silent=false and hard_break cases
      if ((curr.result === IN_ERR || curr.result === FAIL) && (hard_break || !silent)) {
        // Show stdout first
        if (output_buffer.length) {
          console.log(output_buffer.join(''))
        }
        // Then show error output
        if (error_buffer.length) {
          console.error(error_buffer.join(''))
        }

        if (hard_break) {
          process.exit(1)
        }
      }

      resolve()
    })

    if (timeout !== -1) {
      countdown = setTimeout(() => {
        c.kill('SIGKILL')
        curr.result = TIMEOUT
      }, timeout)
    }
  })
}

/**
 * Run multiple test scripts in sequence
 * @param {(string|Object)[]} entries - Array of test scripts or test configurations
 * @param {Object} options - Runner options
 * @param {boolean} [options.log=false] - Log results after completion
 * @param {number} [options.timeout=5000] - Default timeout for tests
 * @param {boolean} [options.silent=false] - Default silent mode for tests
 * @returns {Promise<Map>} Map of test results
 */
export async function runner (entries, { log = false, timeout = DEF_TIMEOUT, silent = DEF_SILENT, hard_break = DEF_HARD_BREAK } = {}) {
  const tests = entries.map(e => {
    if (typeof e === 'string') {
      return { script: e, silent, timeout, hard_break }
    }
    if (typeof e === 'object') {
      return {
        script: e.script,
        silent: typeof e.silent === 'boolean' ? e.silent : silent,
        timeout: typeof e.timeout === 'number' ? e.timeout : timeout,
        hard_break: typeof e.hard_break === 'boolean' ? e.hard_break : hard_break
      }
    }
  })

  try {
    for (let i = 0; i < tests.length; i++) {
      await test(tests[i].script, { 
        silent: tests[i].silent, 
        timeout: tests[i].timeout,
        hard_break: tests[i].hard_break 
      })
    }
  } catch (err) {
    if (log) {
      log_results()
    }
    throw err
  }

  if (log) {
    log_results()
  }

  return results
}

/**
 * Log a summary of test results to console
 */
export function log_results () {
  let success = 0
  let fail = 0
  let error = 0
  let fail_timeout = 0

  results.forEach(t => {
    switch (t.result) {
      case SUCCESS:
        success++
        break
      case TIMEOUT:
        fail_timeout++
        break
      case IN_ERR:
        error++
        break
      case FAIL:
        fail++
        break
    }
  })

  console.log(``)
  console.log(`Executed ${ results.size } tests:`)
  console.log(` - success : ${ wrap_if_non0(pal_success, success) }`)
  console.log(` - fail    : ${ wrap_if_non0(pal_fail, fail) }`)
  console.log(` - error   : ${ wrap_if_non0(pal_error, error) }`)
  console.log(` - timeout : ${ wrap_if_non0(pal_fail, fail_timeout) }`)
  console.log(``)
}

/**
 * Get all JavaScript files from a directory
 * @param {string} dir_path - Directory path to scan
 * @returns {string[]} Array of absolute file paths
 */
export function pick_files (dir_path) {
  return fs
      .readdirSync(dir_path)
      .filter(f => f.endsWith('.js'))
      .map(f => (path.resolve(`./${ dir_path }/${ f }`)))

}

/**
 * Automatically run all JavaScript files in a directory as tests
 * @param {string} dir_path - Directory containing test files
 * @param {Object} options - Runner options
 * @param {boolean} [options.log=false] - Log results after completion
 * @param {number} [options.timeout=5000] - Default timeout for tests
 * @param {boolean} [options.silent=false] - Default silent mode for tests
 * @returns {Promise<Map>} Map of test results
 */
export async function auto_runner (dir_path, { log = false, timeout = DEF_TIMEOUT, silent = DEF_SILENT, hard_break = DEF_HARD_BREAK } = {}) {
  return runner(
    pick_files(dir_path).map(script => ({ script, timeout, silent, hard_break })), 
    { log, timeout, silent, hard_break }
  )
}

/**
 * Wrap a number with color if non-zero
 * @param {string} wrap - ANSI color code
 * @param {number} n - Number to wrap
 * @returns {string} Colored string
 * @private
 */
function wrap_if_non0 (wrap, n) {
  return n
      ? wrap + n + pal_normal
      : pal_dim + n + pal_normal
}

/**
 * Clear all test results from memory
 */
export function flush_results () {
  results.clear()
}