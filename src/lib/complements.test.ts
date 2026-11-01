import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import Papa from 'papaparse'
import { applyComplements } from './complements'
import { exportBivouacsCsv, parseBivouacsCsv, safeUrl } from './csv'
import { attachSourceControls, getEnrichment } from './enrichment'

const readData = (file: string) => readFileSync(new URL(`../../data/${file}`, import.meta.url), 'utf8')
const enriched = attachSourceControls(parseBivouacsCsv(readData('Bivacco_Explorer_enrichi.csv')).bivouacs,
  readData('Bivacco_Explorer_sources_et_controles.csv'))
const complementsCsv = readData('Bivacco_Explorer_complements.csv')

test('Beltrando receives a sourced ascent without rewriting its supplied rows or adding seasons', () => {
  const original = structuredClone(enriched)
  const seed = applyComplements(enriched, complementsCsv)
  assert.deepEqual(enriched, original)
  const before = enriched.find(item => item.name === 'Bivacco Beltrando')!
  const after = seed.find(item => item.id === before.id)!
  assert.deepEqual(before.seasons.map(profile => profile.ascentHours), [0, 0])
  assert.deepEqual(after.seasons.map(profile => [profile.season, profile.ascentHours, profile.elevationGainM, profile.summerDeparture]),
    before.seasons.map(profile => [profile.season, 3.37, profile.elevationGainM, profile.summerDeparture]))
  for (const profile of after.seasons) {
    assert.match(profile.route!, /Alpe Losa.*Livi.*EEA/s)
    assert.ok(safeUrl(profile.complementSource))
    assert.equal(profile.complementDate, '2026-11-01')
    assert.equal(profile.originalNotes, before.seasons[0].originalNotes)
  }
  assert.match(after.description, /sommet même de la Punta Rama/)
  assert.equal(after.highlight, 'Dormir au sommet même de la Punta Rama')
  assert.deepEqual(after.rawRecords.slice(0, before.rawRecords.length), before.rawRecords)
  assert.equal(after.rawRecords.length, before.rawRecords.length + 2)
  assert.deepEqual(getEnrichment(after), getEnrichment(before))
  assert.deepEqual(seed.filter(item => item.id !== before.id), enriched.filter(item => item.id !== before.id))
})

test('complemented places survive a CSV export and reimport unchanged', () => {
  const seed = applyComplements(enriched, complementsCsv)
  assert.deepEqual(parseBivouacsCsv(exportBivouacsCsv(seed)).bivouacs, seed)
})

test('a complement that targets an unknown place or source row fails visibly', () => {
  const rows = Papa.parse<Record<string, string>>(complementsCsv.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: 'greedy' }).data
  const unknownPlace = Papa.unparse([{ ...rows[0], 'Cabane / lieu': 'Abri imaginaire' }])
  assert.throws(() => applyComplements(enriched, unknownPlace), /aucun bivouac/)
  const unknownRow = Papa.unparse([{ ...rows[0], 'Complète [ligne]': '999' }])
  assert.throws(() => applyComplements(enriched, unknownRow), /introuvable/)
})
