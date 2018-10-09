'use strict'

// core
const fs = require('fs')
const { spawn } = require('child_process')

// npm
const got = require('got')
const ProgressBar = require('progress')

const re = / data-name="audiofil".+>([^]+?)<\/script>/
const re2 = /mediaUniqueId.*?:.*?'(.+?)'/
const re3 = / time=(\d\d):(\d\d):(\d\d)\.(\d\d) bitrate/

const gotPl = got.extend({
  json: true,
  headers: { Authorization: 'Client-Key 773aea60-0e80-41bb-9c7f-e6d7c3ad17fb' }
})

const big = async (cnt) => {
  console.error('Parsing...')
  const x = cnt.match(re)
  if (!x || !x[1]) {
    console.error('yikes1, x:', x)
    throw new Error('Yikes1')
  }
  const j = JSON.parse(x[1])
  const x2 = cnt.match(re2)
  const one = j && j.QueueItems && x2 && x2[1] && j.QueueItems.find(({ IdMediaUnique }) => IdMediaUnique === x2[1])
  if (!one) {
    console.error('yikes2, x2:', Object.keys(x2), x2[1])
    throw new Error('Yikes2')
  }
  console.error(one.Title, one.Broad, one.IdMediaUnique)
  const outFilename = `${one.IdMediaUnique}.aac`

  if (fs.existsSync(outFilename)) {
    return console.error('Already downloaded:', outFilename)
  }

  const { body: { url } } = await gotPl(`https://services.radio-canada.ca/media/validation/v2/?connectionType=hd&output=json&multibitrate=true&deviceType=ipad&appCode=medianet&idMedia=${one.IdMedia}`)
  console.error('Reading stream...')
  return new Promise((resolve, reject) => {
    const bar = new ProgressBar(':bar :eta s.', { total: one.Duration })
    const ff = spawn('ffmpeg', [
      '-y',
      '-ss',
      one.SeekTime,
      '-i',
      url,
      '-acodec',
      'copy',
      '-t',
      one.Duration,
      outFilename
    ])
    let lastSecs = 0
    ff.stderr.on('data', (data) => {
      const time = data.toString().match(re3)
      if (time) {
        const [, h, m, s, ms] = time
        const secs = Date.UTC(1970, 0, 1, parseInt(h, 10), parseInt(m, 10), parseInt(s, 10) + Math.round(parseInt(ms, 10) / 100)) / 1000
        bar.tick(secs - lastSecs)
        lastSecs = secs
      }
    })
    ff.once('close', (code) => {
      if (code) {
        reject(new Error(`ffmpeg process exited with code ${code}`))
      } else {
        resolve(outFilename)
      }
    })
    ff.once('error', reject)
  })
}

module.exports = (s) => got(s)
  .then(({ body }) => body)
  .then(big)
  .then((outFilename) => outFilename && console.error('Downloaded', outFilename))
  .catch((err) => {
    if ((err.errno === 'ENOENT') && (err.path === 'ffmpeg')) {
      throw new Error('ffmpeg is required and must be found in the path.')
    }
    if (err.statusCode === 404) {
      throw new Error(`Not found: ${err.url}`)
    }
    throw err
  })
