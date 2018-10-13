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
      .replace(' (Écouter l\'élément)', '')
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

  /* istanbul ignore next */
  if (ret.length) {
    return ret
  }
  /* istanbul ignore next */
  throw new Error('None found.')
}

const findOne = (j, o1) => {
  const thing = o1.IdMediaUnique && j.QueueItems.find(({ IdMediaUnique }) => IdMediaUnique === o1.IdMediaUnique)
  if (!thing || !thing.Duration) {
    return
  }
  /* istanbul ignore else */
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

  /* istanbul ignore if */
  if (!x || !x[1]) {
    throw new Error('Yikes1')
  }
  const j = JSON.parse(x[1])
  /* istanbul ignore if */
  if (!j.QueueItems || !j.QueueItems.length) {
    throw new Error('No items found.')
  }
  const ret = findEm(body).map(findOne.bind(null, j)).filter(Boolean)
  /* istanbul ignore if */
  if (!ret.length) {
    throw new Error('No valid items match.')
  }
  return ret
}

const findStream = async (one) => {
  /* istanbul ignore if */
  if (!one || !one.playlistUrl) {
    throw new Error('Argument should be an object with a playlistUrl field.')
  }
  const { body: { message, errorCode, url, bitrates } } = await gotPl(one.playlistUrl)

  /* istanbul ignore if */
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

const ffmpegger = ({ outFilename, SeekTime, Duration, IdMediaUnique }, url) => {
  const opts = [...ffmpegOptions]
  opts[2] = SeekTime
  opts[4] = url
  opts[8] = Duration
  opts[9] = outFilename
  return spawn('ffmpeg', opts)
}

const readStream = (one, ping = () => undefined) => new Promise((resolve, reject) => {
  const url = one && one.streamUrl && one.streamUrl.full
  if (!url) {
    throw new Error('Missing url field.')
  }
  const now = Date.now()

  /* istanbul ignore if */
  if (!one.outFilename) {
    one.outFilename = `${one.IdMediaUnique}.aac`
  }

  const ff = ffmpegger(one, url)
  let lastSecs = 0
  ff.stderr.on('data', (data) => {
    const time = data.toString().match(re3)
    if (time) {
      const [, h, m, s, ms] = time
      const secs = Date.UTC(1970, 0, 1, parseInt(h, 10), parseInt(m, 10), parseInt(s, 10) + Math.round(parseInt(ms, 10) / 100)) / 1000
      ping(secs - lastSecs)
      lastSecs = secs
    }
  })
  ff.once('close', (code) => {
    /* istanbul ignore if */
    if (code) {
      reject(new Error(`ffmpeg process exited with code ${code}`))
    } else {
      one.elapsed = Math.round((Date.now() - now) / 1000)
      one.now = new Date().toISOString()
      resolve(one)
    }
  })
  ff.once('error', reject)
})

module.exports = {
  findStream,
  findMeta,
  readStream
}
