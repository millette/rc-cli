'use strict'

// core
const { spawn } = require('child_process')
const { parse } = require('querystring')
const { URL } = require('url')

// npm
const got = require('got')
const decode = require('parse-entities')

// self
const { name, version } = require('./package.json')

const re = / data-name="audiofil".+>([^]+?)<\/script>/
const re3 = / time=(\d\d):(\d\d):(\d\d)\.(\d\d) bitrate/
const reMedias = /A11yTitlePlayPause *: *(\{[^]+?\})/g

const Authorization = 'Client-Key 773aea60-0e80-41bb-9c7f-e6d7c3ad17fb'
const gotStream = got.extend({ headers: { 'User-Agent': `${name} v${version}` } })
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

const readStreamAll = async (s) => {
  const all = await findMeta(s)
  if (!all.length) {
    throw new Error('No stream found.')
  }
  return Promise.all(all.map(findStream))
}

const readStreamIfSingle = async (s) => {
  const all = await findMeta(s)
  if (all.length !== 1) {
    throw new Error('Not single.')
  }
  return findStream(all[0])
}

const findStream = async (one) => {
  if (!one || !one.playlistUrl) {
    throw new Error('Argument should be an object with a playlistUrl field.')
  }
  const { body: { message, errorCode, url, bitrates } } = await gotPl(one.playlistUrl)
  if (message || errorCode) {
    const err = new Error(message || 'Undetermined error')
    if (errorCode) {
      err.errorCode = errorCode
    }
    throw err
  }
  const { origin, search, pathname } = new URL(url)
  return {
    ...one,
    bitrates,
    streamUrl: {
      full: url,
      origin,
      query: parse(search.slice(1), '~'),
      pathname
    }
  }
}

const ffmpegger = ({ SeekTime, Duration, IdMediaUnique }, url, outFilename) => {
  const opts = [...ffmpegOptions]
  opts[2] = SeekTime
  opts[4] = url
  opts[8] = Duration
  opts[9] = outFilename || `${IdMediaUnique}.aac`
  return spawn('ffmpeg', opts)
}

// const readStream = ({ one, url }, ping = () => undefined) => new Promise((resolve, reject) => {
const readStream = (one, ping = () => undefined) => new Promise((resolve, reject) => {
  const url = one && one.streamUrl && one.streamUrl.full
  if (!url) {
    throw new Error('Missing url field.')
  }
  // console.error('Reading stream...')
  const ff = ffmpegger(one, url)
  let lastSecs = 0
  ff.stderr.on('data', (data) => {
    const time = data.toString().match(re3)
    if (time) {
      const [, h, m, s, ms] = time
      const secs = Date.UTC(1970, 0, 1, parseInt(h, 10), parseInt(m, 10), parseInt(s, 10) + Math.round(parseInt(ms, 10) / 100)) / 1000
      // bar.tick(secs - lastSecs)
      ping(secs - lastSecs)
      lastSecs = secs
    }
  })
  ff.once('close', (code) => {
    if (code) {
      reject(new Error(`ffmpeg process exited with code ${code}`))
    } else {
      resolve()
      // resolve(outFilename)
    }
  })
  ff.once('error', reject)
})

module.exports = {
  findStream,
  findMeta,
  readStream,
  readStreamIfSingle,
  readStreamAll
}
