'use strict'

// self
const rad = require('.')

const s1 = process.argv[2]

if (s1 && !s1.indexOf('https://ici.radio-canada.ca/premiere/')) {
  rad(s1).catch(console.error)
} else {
  console.error('Required: radio-canada url.')
}
