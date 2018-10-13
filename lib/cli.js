'use strict'

// npm
const ProgressBar = require('progress')
const inquirer = require('inquirer')
const pEachSeries = require('p-each-series')

// self
const { readStream, findStream, findMeta } = require('..')

const makePicks = (all) => all.map((one, i) => ({
  type: 'confirm',
  name: `confirm.${i}`,
  message: `Download ${one.Title} (env. ${Math.round(one.Duration / 60)}m.)`
}))

const parseAnswers = ({ confirm }) => {
  let r
  const ret = []
  for (r in confirm) {
    if (confirm[r]) { ret.push(r) }
  }
  return ret
}

const za = async (all) => inquirer
  .prompt(makePicks(all))
  .then(parseAnswers)
  .then((x) => x.map((y) => all[y]))

const doit = async (one) => {
  console.log(`Locating stream ${one.Title}`)
  const g = await findStream(one)
  console.log(`Downloading ${g.Title} (${Math.round(g.Duration / 60)}m.)`)
  const bar = new ProgressBar(':bar :eta s.', { clear: true, total: g.Duration })
  g.outFilename = `outs/${g.IdMediaUnique}.aac`
  return readStream(g, bar.tick.bind(bar))
}

const runImp = async (s) => {
  const all = await findMeta(s && s[0])
  const red = Math.round(all.reduce((a, { Duration }) => a + Duration, 0) / 60)
  console.log(`Found ${all.length} items (env. ${red}m.).`)
  if (s[1]) {
    const idx = parseInt(s[1], 10)
    const one = all[idx]
    if (!one || !one.Title) {
      const err = new Error('Invalid index.')
      err.max = all.length - 1
      err.given = idx
      return err
    }
    const yup = await doit(one)
    return [yup]
  }

  const x = await za(all)
  return pEachSeries(x, doit)
  // return 'all good'
}

const run = async (s) => {
  const all = await runImp(s)
  console.log('JSON:', JSON.stringify(all, null, '  '))
  return all
}

module.exports = run
