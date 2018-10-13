'use strict'

// self
const cli = require('./lib/cli')

cli(process.argv.slice(2))
  .then(console.log)
  .catch(console.error)
