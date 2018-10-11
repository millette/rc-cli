'use strict'

// core
// const fs = require('fs')
const { spawn } = require('child_process')

// npm
const got = require('got')
const ProgressBar = require('progress')
const decode = require('parse-entities')

// self
const { name, version } = require('./package.json')

const re = / data-name="audiofil".+>([^]+?)<\/script>/
const re3 = / time=(\d\d):(\d\d):(\d\d)\.(\d\d) bitrate/
const reMedias = /A11yTitlePlayPause *: *(\{[^]+?\})/g

const gotStream = got.extend({ headers: { 'User-Agent': `${name} v${version}` } })
const Authorization = 'Client-Key 773aea60-0e80-41bb-9c7f-e6d7c3ad17fb'
const gotPl = got.extend({
  json: true,
  headers: {
    'User-Agent': `${name} v{$version}`,
    Authorization
  }
})

// eslint-disable-next-line no-sparse-arrays,comma-spacing
const ffmpegOptions = ['-y', '-ss',, '-i',, '-acodec', 'copy', '-t',,]

const parseJsObject = (str) => {
  // console.log('STR:', str)
  // eslint-disable-next-line no-eval
  const { mediaUniqueId, playTitle } = eval(`let $root = { mediaUniqueId: null }, isPlaying, play; play = ${str}`)
  return mediaUniqueId && playTitle && {
    IdMediaUnique: mediaUniqueId,
    Title: decode(decode(playTitle))
      .replace(' (Écouter l’élément)', '')
      .replace(' (Écouter le segment)', '')
  }
}

const findEm = (str) => {
  let ar
  const ret = []
  let o
  while ((ar = reMedias.exec(str)) !== null) {
    if ((o = parseJsObject(ar[1]))) {
      ret.push(o)
    }
  }
  if (ret.length) {
    return ret
  }
  throw new Error('None found.')
}

const readStream = ({ one, body }) => new Promise((resolve, reject) => {
  // console.log('BODY:', body)
  const { url } = body
  if (!url) { return }
  console.error('Reading stream...')
  const outFilename = `${one.IdMediaUnique}.aac`
  const bar = new ProgressBar(':bar :eta s.', { clear: true, total: one.Duration })
  const opts = [...ffmpegOptions]
  opts[2] = one.SeekTime
  opts[4] = url
  opts[8] = one.Duration
  opts[9] = outFilename
  const ff = spawn('ffmpeg', opts)
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

const findOne = (j, o1) => {
  const thing = o1.IdMediaUnique && j.QueueItems.find(({ IdMediaUnique }) => IdMediaUnique === o1.IdMediaUnique)
  if (!thing || !thing.Duration) {
    return
  }
  if (thing.RelatedContents && thing.RelatedContents.length) {
    thing.RelatedContents = thing.RelatedContents.map((a) => ({
      ...a,
      Title: decode(a.Title)
    }))
  } else {
    delete thing.RelatedContents
  }
  return {
    ...thing,
    ...o1,
    playlistUrl: `https://services.radio-canada.ca/media/validation/v2/?connectionType=hd&output=json&multibitrate=true&deviceType=ipad&appCode=medianet&idMedia=${thing.IdMedia}`,
    context: j.QueueContext
  }
}

const findMeta = async (s) => {
  if (typeof s !== 'string' || !s) {
    throw new Error('URL must start with https://ici.radio-canada.ca/')
  }
  s = s.replace('http://', 'https://')
  if (s.indexOf('https://')) {
    s = `https://${s}`
  }
  if (s.indexOf('https://ici.radio-canada.ca/')) {
    throw new Error('URL must start with https://ici.radio-canada.ca/')
  }
  const { body } = await gotStream(s)
  const x = body.match(re)
  if (!x || !x[1]) {
    throw new Error('Yikes1')
  }
  const j = JSON.parse(x[1])
  if (!j.QueueItems || !j.QueueItems.length) {
    throw new Error('No items found.')
  }
  const ret = findEm(body).map(findOne.bind(null, j)).filter(Boolean)
  if (!ret.length) {
    throw new Error('No valid items match.')
  }
  return ret
}

const findStream = async (all) => {
  const [one] = all
  if (all.length > 1) {
    console.log(
      'More available:',
      all.slice(1).map(({ Title, Duration }) => ({ Title, Duration }))
    )
  }
  const { body } = await gotPl(one.playlistUrl)
  if (body.message) {
    const err = new Error(body.message)
    err.errorCode = body.errorCode
    throw err
  }

  return { one, body }
}

/*
module.exports = (s) => findMeta(s)
  .then(findStream)
  .then(readStream)
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
*/

module.exports.findStream = findStream
module.exports.findMeta = findMeta
module.exports.readStream = readStream
