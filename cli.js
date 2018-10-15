#!/usr/bin/env node

'use strict'

// self
const cli = require('./lib/cli')

// npm
const meow = require('meow')

const args = meow(`
  Usage

    $ radcan URL

  Options
    --id      -i  ID (1, 2, 3...)
    --dir     -d  Output directory, defaults to current
    --all     -a  Download all segments
    --quiet   -q  Quiet mode
    --version     Version
  `, {
  inferType: true,
  flags: {
    id: {
      type: 'string',
      alias: 'i'
    },
    dir: {
      type: 'string',
      alias: 'd',
      default: '.'
    },
    all: {
      type: 'boolean',
      alias: 'a'
    },
    quiet: {
      type: 'boolean',
      alias: 'q'
    }
  }
})

cli(args)
  .then(() => console.log('All good.'))
  .catch(console.error)
