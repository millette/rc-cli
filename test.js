// npm
import test from 'ava'

// self
// import oy, { findStream, readStream, findMeta } from '.'
import { findMeta } from '.'

/*
  * https://ici.radio-canada.ca/premiere/emissions/info-matin/episodes/417134/audio-fil-du-jeudi-4-octobre-2018
  * NONO https://ici.radio-canada.ca/premiere/emissions/premiere-heure/segments/entrevue/87613/virage-numerique-entreprise
  * https://ici.radio-canada.ca/premiere/emissions/premiere-heure/segments/entrevue/875613/virage-numerique-entreprise
*/

test('yup #2', async (t) => {
  const all = await findMeta('https://ici.radio-canada.ca/premiere/emissions/midi-info/segments/entrevue/89953/agriculture-changements-climatiques-production-effets')
  const [{ Duration, SeekTime, IdMediaUnique }] = all
  t.is(all.length, 1)
  t.is(Duration, 759)
  t.is(SeekTime, 657)
  t.is(IdMediaUnique, '7969196-657')
})

test('yup #2new', async (t) => {
  const all = await findMeta('http://ici.radio-canada.ca/premiere/emissions/midi-info/episodes/417626/audio-fil-du-jeudi-11-octobre-2018')
  const [{ Duration, SeekTime, IdMediaUnique, context: { Id, TitleProgramme } }] = all
  t.is(all.length, 17)
  t.is(Duration, 84)
  t.is(SeekTime, 0)
  t.is(Id, '417626')
  t.is(TitleProgramme, 'Midi info')
  t.is(IdMediaUnique, '7970838-0')
})

test('yup #2more', async (t) => {
  const all = await findMeta('ici.radio-canada.ca/premiere/emissions/midi-info/segments/entrevue/89587/couillard-philippe-depart-demission-fin-carriere-politique?isAutoPlay=1')
  const [{ Duration, SeekTime, IdMediaUnique }] = all
  t.is(all.length, 1)
  t.is(Duration, 569)
  t.is(SeekTime, 51)
  t.is(IdMediaUnique, '7967514-51')
})

// FIXME: these will change each day...
test('yup #2zaga', async (t) => {
  const all = await findMeta('https://ici.radio-canada.ca/premiere/emissions/midi-info')
  const [{ Duration, SeekTime, IdMediaUnique, context: { Id, TitleProgramme } }] = all
  t.is(all.length, 17)
  t.is(Duration, 84)
  t.is(SeekTime, 0)
  t.is(Id, '417626')
  t.is(TitleProgramme, 'Midi info')
  t.is(IdMediaUnique, '7970838-0')
})

test('yup #2zaza', async (t) => {
  const all = await findMeta('https://ici.radio-canada.ca/premiere/premiereplus/science/p/49306/limprimante-3d-arrive-et-elle-va-changer-nos')
  const [g] = all
  t.is(all.length, 3)
  t.is(g.Duration, 351)
  t.is(g.SeekTime, 0)
  t.is(g.IdMediaUnique, '7288301-0')
})

test('yup #2boza', async (t) => {
  const all = await findMeta('https://ici.radio-canada.ca/premiere/emissions/desautels-le-dimanche')
  const [{ Duration, SeekTime, IdMediaUnique }] = all
  const red = all.map(({ Duration }) => Duration).reduce((a, b) => a + b, 0)
  t.is(all.length, 13)
  t.is(Duration, 360)
  t.is(SeekTime, 0)
  t.is(red, 6203)
  t.is(IdMediaUnique, '7968845-0')
})

test('yup #2abc', async (t) => {
  const [g] = await findMeta('ici.radio-canada.ca/premiere/emissions/midi-info/segments/entrevue/89953/agriculture-changements-climatiques-production-effets')
  t.is(g.Duration, 759)
  t.is(g.SeekTime, 657)
  t.is(g.IdMediaUnique, '7969196-657')
})

// valid throws
test('yup #2b', async (t) => {
  await t.throwsAsync(findMeta('https://ici.radio-canada.ca/premiere/emissions/midi-info/segments/entrevue/989953/agriculture-changements-climatiques-production-effets'), 'Response code 500 (Internal Server Error)')
})

test('yup #3', async (t) => {
  await t.throwsAsync(findMeta('http://ici.radio-canada.ca/premiere/emissions/midi-info/segments/entrevue/9953/agriculture-changements-climatiques-production-effets'), 'No valid items match.')
})

test('yup #4', async (t) => {
  await t.throwsAsync(findMeta('https://bob.radio-canada.ca/premiere/emissions/midi-info/segments/entrevue/9953/agriculture-changements-climatiques-production-effets'), 'URL must start with https://ici.radio-canada.ca/')
})

test('yup #5', async (t) => {
  await t.throwsAsync(findMeta('ici.radio-canada.ca/premiere/emissions/midi-info/segments/entrevue/9953/agriculture-changements-climatiques-production-effets'), 'No valid items match.')
})

test('yup #6', async (t) => {
  await t.throwsAsync(findMeta('https://ici.radio-canada.ca/premiere/emissions/midi-info/segments/entrevue/89953/'), 'Response code 404 (Not Found)')
})
