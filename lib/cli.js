'use strict'

// npm
const ProgressBar = require('progress')
const inquirer = require('inquirer')

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

const run = async (s) => {
  const all = await findMeta(s)
  const red = Math.round(all.reduce((a, { Duration }) => a + Duration, 0) / 60)
  console.log(`Found ${all.length} items (env. ${red}m.).`)
  const x = await za(all)
  const streams = await Promise.all(x.map(findStream))
  streams.forEach(async (one) => {
    const bar = new ProgressBar(':bar :eta s.', { clear: true, total: one.Duration })
    // await readStream({ one, url: one.streamUrl.full }, bar.tick.bind(bar))
    await readStream(one, bar.tick.bind(bar))
  })
  return 'all good'
}

module.exports = run
