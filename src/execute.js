import { FAIL, IN_ERR, microtime, SUCCESS } from './tools.js'

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

const success = (note) => {
  exit_code = 0
  test.result = SUCCESS
  complete(note)
}

const fail = (note) => {
  exit_code = 1
  test.result = FAIL
  complete(note)
}

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

