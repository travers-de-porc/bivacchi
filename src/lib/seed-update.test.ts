import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import Papa from 'papaparse'
import { exportBivouacsCsv, mergeBivouacs, parseBivouacsCsv } from './csv'
import { attachSourceControls, getEnrichment } from './enrichment'
import { createLocalRepository, STORAGE_KEY } from './repository'
import { updateSeed } from './seed-update'

const readData = (file: string) => readFileSync(new URL(`../../data/${file}`, import.meta.url), 'utf8')
const previousSeed = parseBivouacsCsv(readData('bivouacs.csv'), 'Bivacco Backlog.xlsx').bivouacs
const nextSeed = attachSourceControls(parseBivouacsCsv(readData('Bivacco_Explorer_enrichi.csv')).bivouacs,
  readData('Bivacco_Explorer_sources_et_controles.csv'))
const options = { revision: 'enriched-2026-10', previousSeed }

test('the enriched seed updates all old positions and photos without losing historic source rows or adding seasonal tabs', () => {
  const original = structuredClone(previousSeed)
  const upgraded = updateSeed(previousSeed, previousSeed, nextSeed)
  assert.equal(upgraded.length, 57)
  assert.equal(upgraded.filter(item => item.coordinates).length, 57)
  assert.equal(upgraded.filter(item => item.imageUrl).length, 56)
  assert.deepEqual(upgraded.map(item => item.seasons), nextSeed.map(item => item.seasons))
  for (const item of upgraded) {
    const previous = previousSeed.find(place => place.id === item.id)!
    for (const record of previous.rawRecords) assert.ok(item.rawRecords.some(raw => JSON.stringify(raw) === JSON.stringify(record)))
    assert.ok(getEnrichment(item).control)
  }
  assert.deepEqual(parseBivouacsCsv(exportBivouacsCsv(upgraded)).bivouacs, upgraded)
  assert.deepEqual(previousSeed, original)
})

test('seed updates preserve all personal edits, cleared original coordinates, imported metadata and additional places', () => {
  const saved = structuredClone(previousSeed)
  Object.assign(saved[0], {
    name: 'Nom corrigé', sector: 'Mon secteur', altitudeM: null, description: '', highlight: 'Mon repère',
    coordinates: { lat: 45, lng: 7 }, wishlist: true, visited: true, personalNotes: 'Une note\nsur deux lignes',
  })
  const clearedId = saved.find(item => item.coordinates && item.id !== saved[0].id)!.id
  saved.find(item => item.id === clearedId)!.coordinates = null
  const target = previousSeed[1]
  const custom = parseBivouacsCsv(Papa.unparse([
    { 'Cabane / lieu': target.name, Secteur: target.sector, Altitude: '3001', Latitude: '46', Longitude: '7', Photo: 'https://example.com/photo.jpg', 'Champ personnel': 'À conserver' },
    { 'Cabane / lieu': 'Abri ajouté', Secteur: 'Local', Altitude: '2000', Latitude: '', Longitude: '', Photo: '', 'Champ personnel': 'Autre' },
  ])).bivouacs
  const combined = mergeBivouacs(saved, custom)
  const upgraded = updateSeed(combined, previousSeed, nextSeed)
  assert.equal(upgraded.length, 58)
  const edited = upgraded.find(item => item.id === saved[0].id)!
  for (const field of ['name', 'sector', 'altitudeM', 'description', 'highlight', 'coordinates', 'wishlist', 'visited', 'personalNotes'] as const) {
    assert.deepEqual(edited[field], combined.find(item => item.id === saved[0].id)![field])
  }
  assert.equal(upgraded.find(item => item.id === clearedId)!.coordinates, null)
  const imported = upgraded.find(item => item.id === target.id)!
  assert.equal(imported.altitudeM, 3001)
  assert.deepEqual(imported.coordinates, { lat: 46, lng: 7 })
  assert.equal(imported.imageUrl, 'https://example.com/photo.jpg')
  const reloaded = parseBivouacsCsv(exportBivouacsCsv(upgraded)).bivouacs
  assert.deepEqual(reloaded, upgraded)
  assert.ok(reloaded.find(item => item.name === 'Abri ajouté'))
  assert.ok(reloaded.find(item => item.id === target.id)!.rawRecords.some(record => record.values['Champ personnel'] === 'À conserver'))
})

test('upgrading local storage is read-only until saving and runs once, preserving subsequent explicit coordinate removal', () => {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
  createLocalRepository(storage).save(previousSeed)
  const original = values.get(STORAGE_KEY)
  const repository = createLocalRepository(storage, options)
  const result = repository.load(nextSeed)
  assert.equal(result.error, null)
  assert.equal(result.bivouacs.filter(item => item.coordinates).length, 57)
  assert.equal(values.get(STORAGE_KEY), original)
  result.bivouacs[0].coordinates = null
  repository.save(result.bivouacs)
  assert.equal(JSON.parse(values.get(STORAGE_KEY)!).seedRevision, options.revision)
  const reloaded = createLocalRepository(storage, options).load(nextSeed)
  assert.equal(reloaded.error, null)
  assert.deepEqual(reloaded.bivouacs, result.bivouacs)
})

test('an unrecognized seed revision protects the stored backup from accidental downgrade', () => {
  const raw = JSON.stringify({ version: 1, seedRevision: 'future', csv: exportBivouacsCsv(nextSeed) })
  let writes = 0
  const repository = createLocalRepository({ getItem: () => raw, setItem: () => { writes++ }, removeItem: () => {} }, options)
  const result = repository.load(nextSeed)
  assert.ok(result.error)
  assert.equal(result.recovery, raw)
  assert.throws(() => repository.save(nextSeed), /protégée/)
  assert.equal(writes, 0)
})
