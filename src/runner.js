import child_process from 'node:child_process'
import fs            from 'node:fs'
import path          from 'node:path'

import { FAIL, FAILED, IN_ERR, make_test_id, NO_RESULT, SUCCESS, TIMEOUT } from './tools.js'

/** @type {Map<string, Object>} Global map of every result produced in this process */
export const results = new Map()

const pal_normal = '\x1b[0m'
const pal_fail = '\x1b[33m'
const pal_success = '\x1b[36m' // cyan, actual green = "\x1b[32m"
const pal_dim = '\x1b[2m'
const pal_error = '\x1b[31m'

/** Default timeout in milliseconds */
const DEF_TIMEOUT = 5000
/** Default silent mode setting */
const DEF_SILENT = true
/** Default hard break setting */
const DEF_HARD_BREAK = false

const COL_RESULT = 12
const COL_DELTA = 16
const COL_PROC = 18

/**
 * Run a single test script in a separate process
 * @param {string} script - Path to the test script
 * @param {Object} [options] - Test options
 * @param {number} [options.timeout=5000] - Timeout in milliseconds (-1 disables it)
 * @param {boolean} [options.silent=true] - Suppress console output from the test
 * @param {boolean} [options.hard_break=false] - Print captured output even when silent
 * @returns {Promise<Object>} Resolves with the result record once the test process exits
 */
export function test (script, { timeout = DEF_TIMEOUT, silent = DEF_SILENT, hard_break = DEF_HARD_BREAK } = {}) {
  return new Promise((resolve) => {

    const curr = {
      uid: make_test_id(),
      name: '',
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
      started: false,
      fullfilled: false,
      exit_code: null,
      signal: null,
    }

    results.set(curr.uid, curr)

    const output_buffer = []
    const error_buffer = []

    let countdown
    let settled = false

    const settle = () => {
      if (settled) return
      settled = true

      clearTimeout(countdown)
      curr.stop_ms = Date.now()

      // a timeout kill is not an "unhandled error" — don't let the fallback overwrite it
      if (curr.result !== TIMEOUT && !curr.fullfilled) {
        curr.result = IN_ERR
        curr.note = curr.note || (curr.started
          ? 'Test process died before reporting a result'
          : 'Process terminated with unhandled error')
      }

      console.log(format_line(curr))

      if (FAILED.has(curr.result) && (hard_break || !silent)) {
        if (output_buffer.length) console.log(output_buffer.join(''))
        if (error_buffer.length) console.error(error_buffer.join(''))
      }

      resolve(curr)
    }

    const c = child_process.fork(script, { silent: true })

    c.stdout?.on('data', (data) => output_buffer.push(data.toString()))
    c.stderr?.on('data', (data) => error_buffer.push(data.toString()))

    c.on('message', (status) => {
      Object.assign(curr, status)
      curr.started = true
      // only the completion message carries done:true — the first one just announces the test
      curr.fullfilled = status.done === true
    })

    c.on('error', (err) => {
      curr.result = IN_ERR
      curr.note = String(err)
      if (!silent) console.error('Process error:', err)
      // a process that never spawned emits no 'exit' — don't leave the promise hanging
      if (!c.pid) settle()
    })

    c.on('exit', (code, signal) => {
      curr.exit_code = code
      curr.signal = signal
      settle()
    })

    if (timeout !== -1) {
      countdown = setTimeout(() => {
        if (curr.fullfilled) return
        curr.result = TIMEOUT
        c.kill('SIGKILL')
      }, timeout)
    }
  })
}

/**
 * Run multiple test scripts in sequence
 * @param {(string|Object)[]} entries - Array of test scripts or test configurations
 * @param {Object} [options] - Runner options
 * @param {boolean} [options.log=false] - Log the summary after completion
 * @param {number} [options.timeout=5000] - Default timeout for tests
 * @param {boolean} [options.silent=true] - Default silent mode for tests
 * @param {boolean} [options.hard_break=false] - Stop the run at the first non-passing test
 *   (see only the first failure instead of all of them)
 * @param {boolean} [options.set_exit_code=true] - Set process.exitCode to 1 if anything failed
 * @returns {Promise<Map<string, Object>>} Map of the results produced by this run
 */
export async function runner (entries, {
  log = false,
  timeout = DEF_TIMEOUT,
  silent = DEF_SILENT,
  hard_break = DEF_HARD_BREAK,
  set_exit_code = true,
} = {}) {
  const tests = entries
      .map(e => typeof e === 'string' ? { script: e } : e)
      .filter(e => e && typeof e.script === 'string')
      .map(e => ({
        script: e.script,
        silent: typeof e.silent === 'boolean' ? e.silent : silent,
        timeout: typeof e.timeout === 'number' ? e.timeout : timeout,
        hard_break: typeof e.hard_break === 'boolean' ? e.hard_break : hard_break,
      }))

  const run = new Map()

  let skipped = 0

  try {
    for (const t of tests) {
      const curr = await test(t.script, t)
      run.set(curr.uid, curr)

      if (t.hard_break && FAILED.has(curr.result)) {
        skipped = tests.length - run.size
        console.log(`${ pal_error }hard_break${ pal_normal } — stopping, ${ skipped } test(s) skipped`)
        break
      }
    }
  } finally {
    if (log) log_results(run, skipped)
    if (set_exit_code && get_summary(run).failed) process.exitCode = 1
  }

  return run
}

/**
 * Tally results by outcome
 * @param {Map<string, Object>} [from=results] - Result map to summarize
 * @returns {{total: number, success: number, fail: number, error: number, timeout: number, unknown: number, failed: number}}
 */
export function get_summary (from = results) {
  const sum = { total: 0, success: 0, fail: 0, error: 0, timeout: 0, unknown: 0, failed: 0 }

  from.forEach(t => {
    sum.total++
    if (FAILED.has(t.result)) sum.failed++

    switch (t.result) {
      case SUCCESS:
        sum.success++
        break
      case TIMEOUT:
        sum.timeout++
        break
      case IN_ERR:
        sum.error++
        break
      case FAIL:
        sum.fail++
        break
      default:
        sum.unknown++
    }
  })

  return sum
}

/**
 * Log a summary of test results to console
 * @param {Map<string, Object>} [from=results] - Result map to report on
 * @param {number} [skipped=0] - Tests that never ran because hard_break stopped the run
 */
export function log_results (from = results, skipped = 0) {
  const sum = get_summary(from)

  console.log(``)
  console.log(`Executed ${ sum.total } tests${ skipped ? ` (${ skipped } skipped)` : '' }:`)
  console.log(` - success : ${ wrap_if_non0(pal_success, sum.success) }`)
  console.log(` - fail    : ${ wrap_if_non0(pal_fail, sum.fail) }`)
  console.log(` - error   : ${ wrap_if_non0(pal_error, sum.error) }`)
  console.log(` - timeout : ${ wrap_if_non0(pal_fail, sum.timeout) }`)
  if (sum.unknown) console.log(` - unknown : ${ wrap_if_non0(pal_error, sum.unknown) }`)
  if (skipped) console.log(` - skipped : ${ wrap_if_non0(pal_fail, skipped) }`)
  console.log(``)
}

/**
 * Get test files from a directory
 * @param {string} dir_path - Directory path to scan
 * @param {Object} [options]
 * @param {string[]} [options.ext=['.js','.mjs']] - Extensions to pick up
 * @param {(string|RegExp)[]} [options.ignore=[]] - File names to skip
 * @returns {string[]} Sorted array of absolute file paths
 */
export function pick_files (dir_path, { ext = ['.js', '.mjs'], ignore = [] } = {}) {
  const skipped = (name) => ignore.some(p => p instanceof RegExp ? p.test(name) : p === name)

  return fs
      .readdirSync(dir_path, { withFileTypes: true })
      .filter(d => d.isFile() && ext.some(e => d.name.endsWith(e)) && !skipped(d.name))
      .map(d => path.resolve(dir_path, d.name))
      .sort()
}

/**
 * Automatically run all test files in a directory
 * @param {string} dir_path - Directory containing test files
 * @param {Object} [options] - Runner options (see runner)
 * @param {string[]} [options.ext=['.js','.mjs']] - Extensions to pick up
 * @param {(string|RegExp)[]} [options.ignore=[]] - File names to skip
 * @returns {Promise<Map<string, Object>>} Map of the results produced by this run
 */
export async function auto_runner (dir_path, { ext, ignore, ...options } = {}) {
  return runner(pick_files(dir_path, { ext, ignore }), options)
}

/**
 * Clear the global results map
 */
export function flush_results () {
  results.clear()
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
 * Build the single-line report for a finished test
 * @param {Object} curr - Result record
 * @returns {string}
 * @private
 */
function format_line (curr) {
  const color = {
    [SUCCESS]: pal_success,
    [FAIL]: pal_fail,
    [TIMEOUT]: pal_fail,
    [IN_ERR]: pal_error,
    [NO_RESULT]: pal_error,
  }[curr.result] || pal_normal

  const delta = curr.result === TIMEOUT
    ? `Δt > ${ curr.timeout }ms `
    : `Δt = ${ curr.fullfilled ? curr.delta.toFixed(2) + curr.delta_precision_sym : 'n/a' } `

  return pad(curr.result, COL_RESULT, ' ', color)
      + dots(delta, COL_DELTA) + ' '
      + dots(`(proc: ${ curr.stop_ms - curr.start_ms }ms) `, COL_PROC) + ' '
      + `${ curr.name || curr.script } ${ pal_dim }>>>${ pal_normal } `
      + (curr.note || `${ pal_dim }[no message]${ pal_normal }`)
}

/**
 * Pad plain text to width, then colorize — padEnd can't measure ANSI codes
 * @private
 */
function pad (text, width, filler, color) {
  return color + text + pal_normal + filler.repeat(Math.max(0, width - text.length))
}

/**
 * Pad with dim dots
 * @private
 */
function dots (text, width) {
  return text + pal_dim + '.'.repeat(Math.max(0, width - text.length)) + pal_normal
}
