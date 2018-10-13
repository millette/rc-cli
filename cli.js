'use strict'

// self
const cli = require('./lib/cli')

const s1 = process.argv[2]

if (s1 && !s1.indexOf('https://ici.radio-canada.ca/premiere/')) {
  cli(s1)
    .then(console.log)
    .catch(console.error)
} else {
  console.error('Required: radio-canada url.')
}
