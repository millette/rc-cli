#!/usr/bin/env node

'use strict'

// self
const cli = require('./lib/cli')

// simulate meow for now
const poc = () => {
  const [input, id] = process.argv.slice(2)
  return {
    input: [input],
    flags: {
      id,
      dir: 'outs'
    }
  }
}

cli(poc())
  .then(console.log)
  .catch(console.error)
