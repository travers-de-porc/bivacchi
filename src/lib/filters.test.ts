import assert from 'node:assert/strict'
import test from 'node:test'
import type { Bivouac, SeasonalProfile } from '../types/bivouac'
import { parseBivouacsCsv } from './csv'
import { DEFAULT_FILTERS, filterBivouacs, type FiltersState } from './filters'

const base = parseBivouacsCsv('Cabane / lieu,Secteur,Saison\nAbri des Mélèzes,Écrins,Été').bivouacs[0]
const place = (changes: Partial<Bivouac> = {}): Bivouac => ({ ...base, ...changes })
const profile = (changes: Partial<SeasonalProfile> = {}): SeasonalProfile => ({ ...base.seasons[0], ...changes })
const filters = (changes: Partial<FiltersState> = {}): FiltersState => ({ ...DEFAULT_FILTERS, ...changes })

test('search ignores accents, case and surrounding whitespace', () => {
  const items = [place()]
  assert.equal(filterBivouacs(items, filters({ search: '  MELEZES  ' })).length, 1)
  assert.equal(filterBivouacs(items, filters({ search: 'ecrins' })).length, 1)
  assert.equal(filterBivouacs(items, filters({ search: 'absent' })).length, 0)
})

test('search includes personal notes and original source notes', () => {
  const item = place({ personalNotes: 'Préparer les jumelles', seasons: [profile({ originalNotes: 'Ancienne note : échelles' })] })
  assert.equal(filterBivouacs([item], filters({ search: 'jumelles' })).length, 1)
  assert.equal(filterBivouacs([item], filters({ search: 'echelles' })).length, 1)
})

test('selecting a season includes only bivouacs with a source profile for that season', () => {
  const summer = place({ id: 'summer' })
  const winter = place({ id: 'winter', seasons: [profile({ season: 'Hiver' })] })
  const unknown = place({ id: 'unknown', seasons: [profile({ season: null })] })
  assert.deepEqual(filterBivouacs([summer, winter, unknown], filters({ season: 'Hiver' })).map((item) => item.id), ['winter'])
  assert.equal(filterBivouacs([summer, winter, unknown], filters()).length, 3)
})

test('missing numeric values cannot satisfy a numeric filter, while an explicit zero remains valid', () => {
  const unknown = place({ id: 'unknown', altitudeM: null, seasons: [profile()] })
  const zero = place({ id: 'zero', altitudeM: 0, seasons: [profile({ ascentHours: 0, isolationRating: 0 })] })
  assert.deepEqual(filterBivouacs([unknown, zero], filters({ altitude: '0-2000' })).map((item) => item.id), ['zero'])
  assert.deepEqual(filterBivouacs([unknown, zero], filters({ ascent: '3' })).map((item) => item.id), ['zero'])
  assert.equal(filterBivouacs([unknown], filters({ isolation: '4' })).length, 0)
})

test('combined ascent, isolation and ski filters must match the same seasonal profile', () => {
  const misleading = place({ id: 'mixed', seasons: [
    profile({ season: 'Été', ascentHours: 2, isolationRating: 1, skiDifficulty: '2.1' }),
    profile({ season: 'Hiver', ascentHours: 7, isolationRating: 5, skiDifficulty: '~3.1' }),
  ] })
  const match = place({ id: 'match', seasons: [profile({ season: 'Hiver', ascentHours: 2, isolationRating: 5, skiDifficulty: '~3.1' })] })
  const selection = filters({ ascent: '3', isolation: '4', ski: '~3.1' })
  assert.deepEqual(filterBivouacs([misleading, match], selection).map((item) => item.id), ['match'])
})

test('selected-season numeric filters do not borrow values from a different season', () => {
  const item = place({ seasons: [
    profile({ season: 'Été', ascentHours: 7 }),
    profile({ season: 'Hiver', ascentHours: 2 }),
  ] })
  assert.equal(filterBivouacs([item], filters({ season: 'Été', ascent: '3' })).length, 0)
  assert.equal(filterBivouacs([item], filters({ season: 'Hiver', ascent: '3' })).length, 1)
})

test('ski difficulty filtering preserves the distinction between estimated and exact grades', () => {
  const estimated = place({ seasons: [profile({ skiDifficulty: '~2.2' })] })
  assert.equal(filterBivouacs([estimated], filters({ ski: '2.2' })).length, 0)
  assert.equal(filterBivouacs([estimated], filters({ ski: '~2.2' })).length, 1)
})

test('wishlist and visited remain independent statuses', () => {
  const wished = place({ id: 'wished', wishlist: true })
  const visited = place({ id: 'visited', visited: true })
  const both = place({ id: 'both', wishlist: true, visited: true })
  assert.deepEqual(new Set(filterBivouacs([wished, visited, both], filters({ status: 'wishlist' })).map((item) => item.id)), new Set(['wished', 'both']))
  assert.deepEqual(new Set(filterBivouacs([wished, visited, both], filters({ status: 'visited' })).map((item) => item.id)), new Set(['visited', 'both']))
})

test('the map-only filter excludes unknown coordinates and sector filtering matches a region', () => {
  const mapped = place({ id: 'mapped', sector: 'Valais · Hérens', coordinates: { lat: 46, lng: 7 } })
  const unknown = place({ id: 'unknown', sector: 'Valais · Zermatt', coordinates: null })
  assert.deepEqual(filterBivouacs([mapped, unknown], filters({ located: true })).map((item) => item.id), ['mapped'])
  assert.equal(filterBivouacs([mapped, unknown], filters({ sector: 'Valais' })).length, 2)
  assert.equal(filterBivouacs([mapped, unknown], filters({ sector: 'Écrins' })).length, 0)
})

test('altitude ranges have an inclusive lower bound and exclusive upper bound', () => {
  const below = place({ id: 'below', altitudeM: 1999 })
  const lower = place({ id: 'lower', altitudeM: 2000 })
  const upper = place({ id: 'upper', altitudeM: 3000 })
  assert.deepEqual(filterBivouacs([below, lower, upper], filters({ altitude: '2000-3000' })).map((item) => item.id), ['lower'])
})

test('altitude sorting keeps missing values last and does not reorder the input array', () => {
  const items = [place({ id: 'unknown', altitudeM: null }), place({ id: 'high', altitudeM: 3000 }), place({ id: 'low', altitudeM: 2000 })]
  assert.deepEqual(filterBivouacs(items, filters({ sort: 'altitude-asc' })).map((item) => item.id), ['low', 'high', 'unknown'])
  assert.deepEqual(filterBivouacs(items, filters({ sort: 'altitude-desc' })).map((item) => item.id), ['high', 'low', 'unknown'])
  assert.deepEqual(items.map((item) => item.id), ['unknown', 'high', 'low'])
})
