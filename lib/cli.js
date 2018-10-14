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

const doit = async (testing, one) => {
  /* istanbul ignore if */
  if (!testing) {
    console.log(`Locating stream ${one.Title}`)
  }
  const g = await findStream(one)
  /* istanbul ignore next */
  g.outFilename = `${testing ? 'tests' : 'outs'}/${g.IdMediaUnique}.aac`

  /* istanbul ignore if */
  if (!testing) {
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

module.exports = async (s, testing) => {
  /* istanbul ignore next */
  try {
    mkdirSync(testing ? 'tests' : 'outs')
  } catch (e) {
    // nop
  }
  const all = await findMeta(s && s[0])
  const red = Math.round(all.reduce((a, { Duration }) => a + Duration, 0) / 60)
  /* istanbul ignore if */
  if (!testing) {
    console.log(`Found ${all.length} items (env. ${red}m.).`)
  }

  /* istanbul ignore if */
  if (!s[1]) {
    if (testing) {
      prompts.inject({ picks: all.slice(0, 1) })
    }
    console.log('ALL-666:', all)
    const picks = await za(all)
    console.log('PICKS-666:', picks)
    const fala = await pEachSeries(picks, doit.bind(null, testing))
    console.log('FALA-666:', fala)
    return fala
  }

  const idx = parseInt(s[1], 10)
  const one = all[idx]
  if (!one || !one.Title) {
    const err = new Error('Invalid index.')
    err.max = all.length - 1
    err.given = idx
    throw err
  }
  const yup = await doit(testing, one)
  return [yup]
}
