import child_process                                              from 'child_process'
import { FAIL, IN_ERR, make_test_id, NO_RESULT, SUCCESS, TIMEOUT } from './tools.js'
import fs                                                         from 'fs'
import path                                                       from 'path'

export const results = new Map()

const pal_normal = '\x1b[0m'
const pal_fail = '\x1b[33m'
const pal_success = '\x1b[36m' // cyan, actual green = "\x1b[32m"
const pal_dim = '\x1b[2m'
const pal_error = '\x1b[31m'

const DEF_TIMEOUT = 5000
const DEF_SILENT = false

export function test (script, { timeout = DEF_TIMEOUT, silent = DEF_SILENT } = {}) {
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

    c = child_process.fork(script, { silent })

    c.on('message', (status) => {
      Object.assign(curr, status)
      curr.fullfilled = true
    })

    c.on('error', (err) => console.error('what could go wrong?', err))

    c.on('exit', (code, err) => {
      curr.stop_ms = Date.now()

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

      output += `${ color }${ curr.result }${ pal_normal }`.padEnd(16 + color.length, ' ')

      output += (curr.result !== TIMEOUT
          ? `Δt = ${ (curr.delta).toFixed(2) }${ curr.delta_precision_sym } `
          : `Δt > ${ (curr.timeout) }ms `)
                    .padEnd(16, '^').replaceAll('^', pal_dim + '.' + pal_normal) + ' '

      output += `(proc: ${ curr.stop_ms - curr.start_ms }ms) `.padEnd(18, '^').replaceAll('^', pal_dim + '.' + pal_normal) + ' '

      output += `${ curr.name || curr.script } ${ pal_dim }>>>${ pal_normal } ${ curr.note || `${ pal_dim }[no message]${ pal_normal }` }`

      curr.exit_code = code

      console.log(output)

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
 *
 * @param {string[] | Object<silent,timeout>[]} entries
 * @param {object} options
 * @param {boolean} [options.silent=false]
 * @param {number} [options.timeout=1000]
 * @returns {Promise<Map<any, any>>}
 */
export async function runner (entries, { log = false, timeout = DEF_TIMEOUT, silent = DEF_SILENT } = {}) {
  const tests = entries.map(e => {
    if (typeof e === 'string') {
      return { script: e, silent, timeout }
    }
    if (typeof e === 'object') {
      return {
        script: e.script,
        silent: typeof e.silent === 'boolean' ? e.silent : silent,
        timeout: typeof e.timeout === 'number' ? e.timeout : timeout,
      }
    }
  })

  for (let i = 0; i < tests.length; i++) {
    await test(tests[i].script, { silent: tests[i].silent, timeout: tests[i].timeout })
  }

  if (log) {
    log_results()
  }

  return results
}

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

export function pick_files (dir_path) {
  return fs
      .readdirSync(dir_path)
      .filter(f => f.endsWith('.js'))
      .map(f => (path.resolve(`./${ dir_path }/${ f }`)))

}

export async function auto_runner (dir_path, { log = false, timeout = DEF_TIMEOUT, silent = DEF_SILENT } = {}) {
  return runner(pick_files(dir_path).map(script => ({ script, timeout, silent })), { log, timeout, silent })
}

function wrap_if_non0 (wrap, n) {
  return n
      ? wrap + n + pal_normal
      : pal_dim + n + pal_normal
}

export function flush_results () {
  results.clear()
}