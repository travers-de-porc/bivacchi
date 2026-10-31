import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import Papa from 'papaparse'
import { exportBivouacsCsv, parseBivouacsCsv } from './csv'
import { attachSourceControls, getEnrichment } from './enrichment'

const enrichedCsv = readFileSync(new URL('../../data/Bivacco_Explorer_enrichi.csv', import.meta.url), 'utf8')
const controlsCsv = readFileSync(new URL('../../data/Bivacco_Explorer_sources_et_controles.csv', import.meta.url), 'utf8')
const seed = () => parseBivouacsCsv(enrichedCsv, 'Bivacco_Explorer_enrichi.csv').bivouacs

test('enriched files provide 57 positions and 56 direct photo links without adding seasonal profiles', () => {
  const parsed = parseBivouacsCsv(enrichedCsv)
  assert.equal(parsed.rowCount, 146)
  assert.equal(parsed.bivouacs.length, 57)
  assert.equal(parsed.bivouacs.filter((place) => place.coordinates).length, 57)
  assert.equal(parsed.bivouacs.filter((place) => place.imageUrl).length, 56)
  const before = structuredClone(parsed.bivouacs)
  const joined = attachSourceControls(parsed.bivouacs, controlsCsv)
  assert.deepEqual(parsed.bivouacs, before, 'attaching evidence must not mutate original source rows')
  assert.equal(joined.flatMap((place) => place.rawRecords).length, 146)
  assert.deepEqual(joined.map((place) => place.seasons), before.map((place) => place.seasons))
  const controls = Papa.parse<Record<string, string>>(controlsCsv, { header: true, skipEmptyLines: 'greedy' }).data
  for (const place of joined) {
    const enrichment = getEnrichment(place)
    assert.deepEqual(enrichment.control?.values, controls.find((row) => row['Cabane / lieu'] === place.name && row.Secteur === place.sector))
    assert.deepEqual(enrichment.coordinates, place.coordinates)
    assert.ok(enrichment.gpsReliability)
    assert.ok(enrichment.photoStatus)
  }
})

test('source uncertainty and missing photographs remain explicit', () => {
  const places = attachSourceControls(seed(), controlsCsv)
  const byName = (name: string) => places.find((place) => place.name === name)!
  assert.equal(getEnrichment(byName('Bivacco Carpano')).gpsReliability, 'à vérifier : sources discordantes')
  assert.equal(getEnrichment(byName('Bivacco Antigine')).gpsReliability, 'indicative')
  const resegotti = byName('Capanna Luigina Resegotti')
  assert.equal(resegotti.imageUrl, null)
  assert.equal(getEnrichment(resegotti).photoStatus, 'non trouvée — recherche manuelle')
  const chillol = getEnrichment(byName('Cabane du berger de Chillol (coord.)'))
  assert.equal(chillol.gpsSource, 'coordonnées déjà présentes dans le fichier source (Google Maps [URL])')
})

test('all enriched source columns and controls survive CSV export and reimport', () => {
  const controls = Papa.parse<Record<string, string>>(controlsCsv, { header: true, skipEmptyLines: 'greedy' }).data
  controls[0]['Champ futur'] = 'Texte original, avec une virgule\net deux lignes'
  const places = attachSourceControls(seed(), Papa.unparse(controls))
  const modified = places.map((place, index) => index ? place : { ...place, name: 'Mon nom local', coordinates: null, wishlist: true })
  const restored = parseBivouacsCsv(exportBivouacsCsv(modified)).bivouacs
  assert.deepEqual(restored, modified)
  assert.equal(getEnrichment(restored[0]).control?.values['Champ futur'], controls[0]['Champ futur'])
  assert.deepEqual(getEnrichment(restored[0]).coordinates, places[0].coordinates)
  assert.deepEqual(attachSourceControls(places, Papa.unparse(controls)), places, 'attaching identical controls is idempotent')
})

test('control joins reject missing, duplicate, unknown or conflicting evidence', () => {
  const controls = Papa.parse<Record<string, string>>(controlsCsv, { header: true, skipEmptyLines: 'greedy' }).data
  assert.throws(() => attachSourceControls(seed(), Papa.unparse(controls.slice(1))), /ne couvre pas tous/)
  assert.throws(() => attachSourceControls(seed(), Papa.unparse([...controls, controls[0]])), /plusieurs fois/)
  for (const [field, value, message] of [
    ['Cabane / lieu', 'Lieu inconnu', /lieu inconnu/],
    ['Secteur', 'Un autre secteur', /lieu inconnu/],
    ['Latitude', '91', /coordonnées invalides/],
    ['Longitude', '', /coordonnées invalides/],
    ['Longitude', '6.1234', /coordonnées invalides/],
    ['Altitude (m)', '1234', /altitude différente/],
    ['GPS [fiabilité]', 'autre', /diffère/],
    ['Photo [URL]', 'https://example.com/another.jpg', /photo différente/],
  ] as const) {
    const changed = controls.map((row, index) => index ? row : { ...row, [field]: value })
    assert.throws(() => attachSourceControls(seed(), Papa.unparse(changed)), message)
  }
  assert.throws(() => attachSourceControls(seed(), 'Cabane / lieu\nUn abri'), /invalide ou incomplet/)
})

test('unsafe URLs and malformed control metadata never become usable links or executable values', () => {
  const place = seed()[0]
  const values = place.rawRecords[0].values
  values['Google Maps GPS [URL]'] = 'javascript:alert(1)'
  values['Sources et contrôles [données]'] = '{invalid json'
  assert.equal(getEnrichment(place).gpsMapsUrl, null)
  assert.equal(getEnrichment(place).control, null)
  assert.equal(values['Sources et contrôles [données]'], '{invalid json')
})

test('custom imported coordinates do not inherit reliability from another source row', () => {
  const original = attachSourceControls(seed(), controlsCsv)[0]
  const custom = {
    ...original,
    coordinates: { lat: 45, lng: 6 },
    rawRecords: [{
      source: 'Mes coordonnées.csv', sheet: '', row: 2,
      values: { 'Cabane / lieu': original.name, Secteur: original.sector, Latitude: '45', Longitude: '6' },
    }, ...original.rawRecords],
  }
  const evidence = getEnrichment(custom)
  assert.deepEqual(evidence.coordinates, original.coordinates)
  assert.notDeepEqual(evidence.coordinates, custom.coordinates)
  assert.equal(evidence.gpsReliability, getEnrichment(original).gpsReliability)

  const documented = structuredClone(custom)
  documented.rawRecords[0].values['GPS [source]'] = 'Mon relevé GPS'
  const customEvidence = getEnrichment(documented)
  assert.deepEqual(customEvidence.coordinates, custom.coordinates)
  assert.equal(customEvidence.gpsSource, 'Mon relevé GPS')
  assert.equal(customEvidence.gpsReliability, null, 'a source without reliability must not borrow the next source’s label')
  assert.equal(customEvidence.gpsMapsUrl, null)
})

test('photo provenance only describes the currently displayed image', () => {
  const original = attachSourceControls(seed(), controlsCsv)[0]
  const custom = {
    ...original,
    imageUrl: 'https://example.com/custom.jpg',
    rawRecords: [{
      source: 'Mes photos.csv', sheet: '', row: 2,
      values: { 'Cabane / lieu': original.name, Secteur: original.sector, 'Photo [URL]': 'https://example.com/custom.jpg' },
    }, ...original.rawRecords],
  }
  const undocumented = getEnrichment(custom)
  assert.equal(undocumented.photoSource, null)
  assert.equal(undocumented.photoStatus, null)
  assert.equal(undocumented.control?.values['Photo [source]'], getEnrichment(original).photoSource)

  const documented = structuredClone(custom)
  documented.rawRecords[0].values['Photo [source]'] = 'Mon album'
  assert.equal(getEnrichment(documented).photoSource, 'Mon album')
  assert.equal(getEnrichment(documented).photoStatus, null)
  documented.rawRecords[0].values['Photo [statut]'] = 'Photo personnelle'
  assert.equal(getEnrichment(documented).photoStatus, 'Photo personnelle')
})
