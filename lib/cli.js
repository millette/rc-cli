'use strict'

// core
const { mkdirSync, writeFileSync } = require('fs')

// npm
const ProgressBar = require('progress')
const prompts = require('prompts')
const pEachSeries = require('p-each-series')

// self
const { readStream, findStream, findMeta } = require('..')

const makePicks = (all) => ({
  type: 'multiselect',
  name: 'picks',
  message: 'Pick segments',
  choices: all.map((value) => ({
    title: `Download ${value.Title} (env. ${Math.round(value.Duration / 60)}m.)`,
    value,
    selected: true
  }))
})

const doit = async (cliArgs, one) => {
  // istanbul ignore if
  if (!cliArgs.flags.quiet) {
    console.log(`Locating stream ${one.Title}`)
  }
  const g = await findStream(one)

  // istanbul ignore if
  if (!cliArgs.flags.quiet) {
    console.log(`Downloading ${g.Title} (${Math.round(g.Duration / 60)}m.)`)
    const bar = new ProgressBar(':bar :eta s.', { clear: true, total: g.Duration })
    const bel = await readStream(g, bar.tick.bind(bar))
    writeFileSync(`${bel.outFilename.replace('.aac', '.json')}`, JSON.stringify(bel, null, '  '))
    return bel
  }

  const oy = await readStream(g)
  writeFileSync(`${oy.outFilename.replace('.aac', '.json')}`, JSON.stringify(oy, null, '  '))
  return oy
}

const za = async (all) => {
  const { picks } = await prompts(makePicks(all))
  return picks
}

module.exports = async (args) => {
  const s = [args.input[0], args.flags.id]
  if (!args.flags.dir) {
    args.flags.dir = '.'
  }
  try {
    mkdirSync(args.flags.dir)
  } catch (e) {
    // nop
  }
  const all = await findMeta(args)
  const red = Math.round(all.reduce((a, { Duration }) => a + Duration, 0) / 60)

  if (!args.flags.quiet) {
    console.log(`Found ${all.length} items (env. ${red}m.).`)
  }

  if (!s[1]) {
    if (args.flags.all) {
      return pEachSeries(all, doit.bind(null, args))
    }

    // istanbul ignore else
    if (args.flags.test) {
      prompts.inject({ picks: all.slice(0, 1) })
    }

    const picks = await za(all)
    return pEachSeries(picks, doit.bind(null, args))
  }

  const idx = s[1] - 1
  const one = s[1] && all[idx]
  if (!one || !one.Title) {
    const err = new Error('Invalid index.')
    err.max = all.length
    err.given = s[1]
    throw err
  }
  const out = await doit(args, one)
  return [out]
}
