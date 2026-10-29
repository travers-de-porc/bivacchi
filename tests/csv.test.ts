import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import Papa from 'papaparse'
import { exportBivouacsCsv, getSeasonProfile, isValidCoordinates, mergeBivouacs, parseBivouacsCsv, safeUrl } from '../src/lib/csv'

const source = readFileSync(new URL('../data/bivouacs.csv', import.meta.url), 'utf8')

const csv = (rows: Record<string, string>[]) => Papa.unparse(rows)

test('actual workbook retains every seasonal source row and groups its 57 locations', () => {
  const result = parseBivouacsCsv(source)
  assert.equal(result.rowCount, 146)
  assert.equal(result.bivouacs.length, 57)
  assert.equal(result.bivouacs.reduce((total, item) => total + item.rawRecords.length, 0), 146)
  assert.equal(result.bivouacs.filter((item) => item.imageUrl).length, 30)
  assert.deepEqual(result.warnings, [])
  assert.equal(result.isBackup, false)
  const seasons = Object.fromEntries(['Été', 'Automne', 'Hiver', 'Printemps'].map((season) => [season, result.bivouacs.flatMap((b) => b.seasons).filter((p) => p.season === season).length]))
  assert.deepEqual(seasons, { Été: 38, Automne: 55, Hiver: 18, Printemps: 35 })
  const first = result.bivouacs[0]
  assert.ok(first.rawRecords[0].values['Score global précis [formule]'].includes('MAX('))
  assert.ok(first.rawRecords[0].values['Fiche officielle [URL]'].startsWith('https://'))
  assert.equal(getSeasonProfile(first)?.season, 'Été')
})

test('only the two explicit source coordinate pairs become map points', () => {
  const points = parseBivouacsCsv(source).bivouacs.filter((b) => b.coordinates)
  assert.deepEqual(points.map((b) => [b.name, b.coordinates]), [
    ['Cabane du berger de Chillol (coord.)', { lat: 44.565, lng: 6.837222 }],
    ['Bivacco Franco Boerio', { lat: 44.61497, lng: 6.95069 }],
  ])
  const named = parseBivouacsCsv(csv([{ Nom: 'Test', 'Google Maps': 'https://www.google.com/maps/place/Test/@45.1,6.1,15z' }])).bivouacs[0]
  assert.equal(named.coordinates, null, 'a map camera position is not a bivouac position')
  const zeros = parseBivouacsCsv(csv([{ Nom: 'Zero', Latitude: '0', Longitude: '0' }])).bivouacs[0]
  assert.deepEqual(zeros.coordinates, { lat: 0, lng: 0 })
  assert.equal(isValidCoordinates({ lat: Number.NaN, lng: 3 }), false)
})

test('complete export/import roundtrip preserves raw fields and local changes with stable identities', () => {
  const places = parseBivouacsCsv(source).bivouacs
  Object.assign(places[0], { name: 'Nom modifié', altitudeM: 3550, coordinates: { lat: -45, lng: 7.5 }, wishlist: true, visited: true, personalNotes: 'Un soir, "en montagne"\nDeuxième ligne ☀️', description: 'Texte local' })
  const backup = exportBivouacsCsv(places)
  const restored = parseBivouacsCsv(backup)
  assert.equal(restored.isBackup, true)
  assert.deepEqual(restored.bivouacs, places)
  assert.equal(restored.bivouacs[0].rawRecords[0].values['Cabane / lieu'], 'Bivouac au Col de la Dent Blanche CAS')
})

test('delimiters, BOM, CRLF, quotes, multiline fields and unknown columns are retained', () => {
  const text = '\uFEFFNom;Secteur;Description;Colonne inconnue\r\n"Abri; un";Alpes;"Une phrase, puis ""une citation"".\r\nAutre ligne";"à conserver"\r\n'
  const parsed = parseBivouacsCsv(text).bivouacs
  assert.equal(parsed[0].name, 'Abri; un')
  assert.equal(parsed[0].description, 'Une phrase, puis "une citation".\r\nAutre ligne')
  assert.equal(parsed[0].rawRecords[0].values['Colonne inconnue'], 'à conserver')
  assert.deepEqual(parseBivouacsCsv(exportBivouacsCsv(parsed)).bivouacs, parsed)
})

test('malformed imports are rejected atomically with actionable errors', () => {
  assert.throws(() => parseBivouacsCsv(''), /vide/)
  assert.throws(() => parseBivouacsCsv('Secteur\nAlpes'), /obligatoire/)
  assert.throws(() => parseBivouacsCsv('Nom,Secteur\nBon,Alpes\n,Alpes'), /Ligne 3/)
  assert.throws(() => parseBivouacsCsv('Nom,Secteur\n"non terminé,Alpes'), /CSV invalide/)
  assert.throws(() => parseBivouacsCsv('Nom,Secteur\nAbri,Alpes,extra'), /CSV invalide/)
  assert.throws(() => parseBivouacsCsv(csv([{ Nom: 'Abri', Latitude: '91', Longitude: '6' }])), /latitude/)
  assert.throws(() => parseBivouacsCsv(csv([{ Nom: 'Abri', Latitude: '45' }])), /latitude/)
  assert.throws(() => parseBivouacsCsv(csv([{ Nom: 'Abri', 'Alt. cabane (m)': 'inconnue' }])), /altitude/)
  assert.throws(() => parseBivouacsCsv(csv([{ Nom: 'Abri', __bivacco_version: '99' }])), /Version/)
})

test('missing facts remain null, invalid ratings retain their original evidence, unsafe links are excluded', () => {
  const parsed = parseBivouacsCsv(csv([{ Nom: 'Abri', 'Classement saison /5': '9', 'Montée (h) ≈': 'environ 4h', 'Fiche officielle': 'javascript:alert(1)' }]))
  const place = parsed.bivouacs[0]
  assert.equal(place.altitudeM, null)
  assert.equal(place.coordinates, null)
  assert.equal(place.imageUrl, null)
  assert.equal(place.links.official, null)
  assert.equal(place.seasons[0].seasonRating, null)
  assert.equal(place.seasons[0].ascentHours, null)
  assert.equal(place.rawRecords[0].values['Classement saison /5'], '9')
  assert.equal(parsed.warnings.length, 2)
  assert.equal(safeUrl('data:text/html,unsafe'), null)
})

test('spreadsheet formula escaping is lossless for original fields and personal notes', () => {
  const parsed = parseBivouacsCsv(csv([{ Nom: '=HYPERLINK("bad")', Secteur: '+1', Inconnu: '@SUM(1,2)', Description: '-1+2' }])).bivouacs
  parsed[0].personalNotes = '=1+1'
  const exported = exportBivouacsCsv(parsed)
  const visible = Papa.parse<Record<string, string>>(exported, { header: true }).data[0]
  assert.equal(visible['Cabane / lieu'], '\'=HYPERLINK("bad")')
  assert.equal(visible['Notes personnelles'], "'=1+1")
  assert.equal(visible.Inconnu, "'@SUM(1,2)")
  assert.deepEqual(parseBivouacsCsv(exported).bivouacs, parsed)
})

test('merge preserves personal state for source CSVs and restores it explicitly from backups', () => {
  const current = parseBivouacsCsv(csv([{ Nom: 'Abri', Secteur: 'Alpes', Description: 'Ancienne' }])).bivouacs
  current[0].wishlist = true
  current[0].personalNotes = 'Mes notes'
  const incoming = parseBivouacsCsv(csv([{ Nom: 'Abri', Secteur: 'Alpes', Description: 'Nouvelle' }])).bivouacs
  const merged = mergeBivouacs(current, incoming)
  assert.equal(merged[0].description, 'Nouvelle')
  assert.equal(merged[0].wishlist, true)
  assert.equal(merged[0].personalNotes, 'Mes notes')
  assert.equal(merged[0].rawRecords.length, 2)
  assert.equal(mergeBivouacs(current, incoming, { restorePersonalState: true })[0].wishlist, false)
  assert.equal(mergeBivouacs(merged, incoming)[0].rawRecords.length, 2)
  const restored = parseBivouacsCsv(exportBivouacsCsv(merged)).bivouacs
  assert.equal(restored[0].rawRecords.length, 2)
  assert.equal(restored[0].description, 'Nouvelle')
})


test('a renamed place merged with a generic source keeps its original identities through backup', () => {
  const original = parseBivouacsCsv(csv([{ Nom: 'Ancien nom', Secteur: 'Alpes' }])).bivouacs
  original[0].name = 'Nouveau nom'
  const incoming = parseBivouacsCsv(csv([{ Nom: 'Nouveau nom', Secteur: 'Alpes' }])).bivouacs
  const merged = mergeBivouacs(original, incoming)
  assert.equal(merged.length, 1)
  assert.equal(merged[0].id, original[0].id)
  assert.equal(merged[0].rawRecords.length, 2)
  assert.deepEqual(parseBivouacsCsv(exportBivouacsCsv(merged)).bivouacs, merged)
})

test('sparse source imports retain known metadata, image, links and source evidence after reload', () => {
  const current = parseBivouacsCsv(csv([{
    Nom: 'Abri', Secteur: 'Alpes', 'Alt. cabane (m)': '2400', Description: 'Description à garder',
    'Coup de cœur': 'Vue du lac', Photo: 'https://example.com/abri.jpg', 'Fiche officielle': 'https://example.com/abri',
    Latitude: '45.4', Longitude: '6.7',
  }])).bivouacs
  current[0].wishlist = true
  current[0].personalNotes = 'Note personnelle'
  const incoming = parseBivouacsCsv(csv([{ Nom: 'Abri', Secteur: 'Alpes', 'Notes originales': 'Nouvelle information' }])).bivouacs
  const merged = mergeBivouacs(current, incoming)
  assert.equal(merged[0].altitudeM, 2400)
  assert.equal(merged[0].description, 'Description à garder')
  assert.equal(merged[0].highlight, 'Vue du lac')
  assert.equal(merged[0].imageUrl, current[0].imageUrl)
  assert.deepEqual(merged[0].links, current[0].links)
  assert.deepEqual(merged[0].coordinates, current[0].coordinates)
  assert.equal(merged[0].rawRecords.length, 2)
  assert.deepEqual(parseBivouacsCsv(exportBivouacsCsv(merged)).bivouacs, merged)
  const backup = parseBivouacsCsv(exportBivouacsCsv(incoming))
  const restored = mergeBivouacs(current, backup.bivouacs, { restorePersonalState: true })
  assert.equal(restored[0].altitudeM, null, 'a backup can intentionally clear editable metadata')
  assert.equal(restored[0].description, '')
  assert.equal(restored[0].coordinates, null)
  assert.deepEqual(parseBivouacsCsv(exportBivouacsCsv(restored)).bivouacs, restored)
})

test('incomplete or unsupported backup data is rejected before it can discard stored information', () => {
  const original = parseBivouacsCsv('Nom\nAbri').bivouacs
  const row = Papa.parse<Record<string, string>>(exportBivouacsCsv(original), { header: true }).data[0]
  for (const field of ['__bivacco_version', '__bivacco_id', '__bivacco_edits', '__bivacco_raw']) {
    assert.throws(() => parseBivouacsCsv(csv([{ ...row, [field]: '' }])), /sauvegarde incomplètes/)
  }
  const partialEdits = JSON.parse(row.__bivacco_edits) as Record<string, unknown>
  delete partialEdits.personalNotes
  assert.throws(() => parseBivouacsCsv(csv([{ ...row, __bivacco_edits: JSON.stringify(partialEdits) }])), /modifications de sauvegarde/)
  const unknownEdits = { ...JSON.parse(row.__bivacco_edits), futureNotes: 'Never discard me' }
  assert.throws(() => parseBivouacsCsv(csv([{ ...row, __bivacco_edits: JSON.stringify(unknownEdits) }])), /modifications de sauvegarde/)
})

test('CSV structural failures are explained in French and malformed Maps paths are retained safely', () => {
  assert.throws(() => parseBivouacsCsv('Nom,Secteur\nAbri,Alpes,extra'), /plus de champs que l’en-tête/)
  assert.throws(() => parseBivouacsCsv('Nom,Secteur\nAbri'), /moins de champs que l’en-tête/)
  assert.throws(() => parseBivouacsCsv('Nom,Secteur\n"non terminé,Alpes'), /guillemets/)
  const brokenMapsLink = 'https://www.google.com/maps/search/%not-encoded'
  const item = parseBivouacsCsv(csv([{ Nom: 'Abri', 'Google Maps': brokenMapsLink }])).bivouacs[0]
  assert.equal(item.coordinates, null)
  assert.equal(item.rawRecords[0].values['Google Maps'], brokenMapsLink)
})
