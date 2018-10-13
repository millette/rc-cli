// core
import { statSync, unlinkSync } from 'fs'

// npm
import test from 'ava'

// self
import { readStream, findMeta, findStream } from '.'
import cli, { makePicks, parseAnswers } from './lib/cli'

test('cli', async (t) => {
  const [one] = await cli(['https://ici.radio-canada.ca/premiere/emissions/midi-info/segments/entrevue/89953/agriculture-changements-climatiques-production-effets', '0'], true)
  t.is(one.outFilename, 'tests/7969196-657.aac')
  const { size } = statSync(one.outFilename)
  t.is(size, 12263336)
  const jsonfile = one.outFilename.replace('.aac', '.json')
  const json = require(`./${jsonfile}`)
  t.is(json.Broad, one.Broad)
  unlinkSync(one.outFilename)
  unlinkSync(jsonfile)
})

test('cli makePick', (t) => {
  const [{ type, name, message }] = makePicks([{ Title: 'El Title', Duration: 120 }])
  t.is(type, 'confirm')
  t.is(name, 'confirm.0')
  t.is(message, 'Download El Title (env. 2m.)')
})

test('cli parseAnswers', (t) => {
  const gg = parseAnswers({
    confirm: {
      'fee': false,
      'fo': true
    }
  })
  t.is(gg[0], 'fo')
})

test('FindStream (3 segments)', async (t) => {
  const all = await findMeta('https://ici.radio-canada.ca/premiere/premiereplus/science/p/49306/limprimante-3d-arrive-et-elle-va-changer-nos')
  const [g] = all
  t.is(all.length, 3)
  t.is(g.Duration, 351)
  t.is(g.SeekTime, 0)
  t.is(g.IdMediaUnique, '7288301-0')

  const { streamUrl: { query, origin, pathname } } = await findStream(all[0])
  t.truthy(query)
  t.is(query && query.acl, '/i/diffusion/2015/05/medianet/cbf/2013-07-20_13_06_00_sphere_0000_01_*')
  t.is(origin, 'https://mediascahls-vh.akamaihd.net')
  t.is(pathname, '/i/diffusion/2015/05/medianet/cbf/2013-07-20_13_06_00_sphere_0000_01_,128,.mp4.csmil/master.m3u8')
})

test('Response code 500 (Internal Server Error)', (t) => t.throwsAsync(findMeta('https://ici.radio-canada.ca/premiere/emissions/midi-info/segments/entrevue/989953/agriculture-changements-climatiques-production-effets'), 'Response code 500 (Internal Server Error)'))
test('No valid items match #1', (t) => t.throwsAsync(findMeta('http://ici.radio-canada.ca/premiere/emissions/midi-info/segments/entrevue/9953/agriculture-changements-climatiques-production-effets'), 'No valid items match.'))
test('URL must start with https://ici.radio-canada.ca/', (t) => t.throwsAsync(findMeta('https://bob.radio-canada.ca/premiere/emissions/midi-info/segments/entrevue/9953/agriculture-changements-climatiques-production-effets'), 'URL must start with https://ici.radio-canada.ca/'))
test('No valid items match #2', (t) => t.throwsAsync(findMeta('ici.radio-canada.ca/premiere/emissions/midi-info/segments/entrevue/9953/agriculture-changements-climatiques-production-effets'), 'No valid items match.'))
test('Response code 404 (Not Found)', (t) => t.throwsAsync(findMeta('https://ici.radio-canada.ca/premiere/emissions/midi-info/segments/entrevue/89953/'), 'Response code 404 (Not Found)'))
test('ReadStream (fail)', (t) => t.throwsAsync(readStream('https://ici.radio-canada.ca/premiere/emissions/midi-info/segments/entrevue/89953/'), 'Missing url field.'))
test('cli (fail)', (t) => t.throwsAsync(cli(['https://ici.radio-canada.ca/premiere/emissions/midi-info/segments/entrevue/89953/agriculture-changements-climatiques-production-effets', '5'], true), 'Invalid index.'))
test('FindMeta argument required', (t) => t.throwsAsync(findMeta(), 'URL must start with https://ici.radio-canada.ca/'))
