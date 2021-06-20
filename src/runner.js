import child_process                                        from 'child_process'
import { FAIL, low_grade_uid, NO_RESULT, SUCCESS, TIMEOUT } from './tools.js'
import fs                                                   from 'fs'
import path                                                 from 'path'

export const results = new Map()

const pal_normal = '\x1b[0m'
const pal_yellow = '\x1b[33m'
const pal_cyan = '\x1b[36m'

export function test ({ script, timeout = 1000, silent = false }) {
  return new Promise((resolve, reject) => {
    const c = child_process.fork(script, { silent })

    let output = ''

    c.uid = low_grade_uid()

    const curr = {
      uid: c.uid,
      name: script,
      note: '~~~',
      timeout,
      script,
      silent,
      result: NO_RESULT,
      delta: 0,
      delta_precision: '-',
      delta_precision_sym: '-',

    }
    results.set(c.uid, curr)

    c.on('message', (status) => Object.assign(curr, status))

    c.on('error', (err) => {
      console.error(err)
      reject()
    })

    c.on('exit', (code) => {
      clearTimeout(countdown)

      const is_success = curr.result === SUCCESS
      const color = is_success ? pal_cyan : pal_yellow

      output += (`[${ color }${ curr.result }${ pal_normal }] `).padEnd(15 + color.length, ' ')
      output += `${ curr.name || curr.script } >> ${ curr.note } / `
      output += curr.result !== TIMEOUT
          ? `Δ=${ (curr.delta).toFixed(2) }${ curr.delta_precision_sym }`
          : `Δ>=${ (curr.timeout) }ms`
      curr.exit_code = code

      console.log(output)

      resolve()
    })

    const countdown = setTimeout(() => {
      c.kill('SIGKILL')
      curr.result = TIMEOUT
    }, timeout)
  })
}

export async function runner (tests = [], silent = false) {
  for (let i = 0; i < tests.length; i++) {
    await test(tests[i], silent)
  }
  let total = tests.length
  let success = 0
  let fail = 0
  let timeout = 0

  results.forEach(t => {
    if (t.result === SUCCESS) success++
    if (t.result === FAIL) fail++
    if (t.result === TIMEOUT) timeout++
  })

  console.log(``)
  console.log(`Executed ${ total } tests:`)
  console.log(` - success : ${ success }`)
  console.log(` - fail    : ${ fail }`)
  console.log(` - timeout : ${ timeout }`)
  console.log(``)

  return results
}


export function pick_files (dir_path) {
  return fs
      .readdirSync(dir_path)
      .filter(f => f.endsWith('.js'))
      .map(f => ({ script: path.resolve(`./${ dir_path }/${ f }`) }))

}

export async function auto_runner (dir_path, silent = false) {
  return runner(pick_files(dir_path))
}
