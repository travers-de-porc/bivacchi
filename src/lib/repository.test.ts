import assert from 'node:assert/strict'
import test from 'node:test'
import { parseBivouacsCsv } from './csv'
import { createLocalRepository, STORAGE_KEY } from './repository'

function seed() {
  return parseBivouacsCsv('Cabane / lieu,Secteur,Saison,Alt. cabane (m),Notes originales\nAbri des Mélèzes,Alpes,Été,2400,Note source\nAbri des Mélèzes,Alpes,Hiver,2400,Autre approche', 'test.csv').bivouacs
}

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
}

test('first launch uses the supplied dataset without writing to storage', () => {
  const storage = memoryStorage()
  const initial = seed()
  const result = createLocalRepository(storage).load(initial)
  assert.deepEqual(result, { bivouacs: initial, error: null, recovery: null })
  assert.equal(storage.values.size, 0)
})

test('saved local edits, statuses, coordinates and original seasonal records survive a reload', () => {
  const storage = memoryStorage()
  const edited = seed().map((item) => ({
    ...item,
    name: 'Abri renommé',
    altitudeM: null,
    wishlist: true,
    visited: true,
    coordinates: { lat: 45.5, lng: 6.5 },
    personalNotes: 'Première ligne, avec virgule\nDeuxième ligne « citée »',
  }))
  createLocalRepository(storage).save(edited)
  const result = createLocalRepository(storage).load(seed())
  assert.equal(result.error, null)
  assert.deepEqual(result.bivouacs, edited)
  assert.equal(result.bivouacs[0].rawRecords.length, 2)
})

for (const [label, raw] of [
  ['invalid JSON', '{not-json'],
  ['a future schema version', JSON.stringify({ version: 99, csv: 'Nom\nFuture data' })],
  ['invalid CSV data', JSON.stringify({ version: 1, csv: 'Unexpected column\nKept data' })],
] as const) {
  test(`${label} is retained for recovery and cannot be silently overwritten`, () => {
    const storage = memoryStorage({ [STORAGE_KEY]: raw })
    const repository = createLocalRepository(storage)
    const initial = seed()
    const result = repository.load(initial)
    assert.deepEqual(result.bivouacs, initial)
    assert.ok(result.error)
    assert.equal(result.recovery, raw)
    assert.throws(() => repository.save(initial), /protégée/)
    assert.equal(storage.getItem(STORAGE_KEY), raw)
  })
}

test('a browser read failure reports the problem and blocks accidental replacement', () => {
  let writes = 0
  const repository = createLocalRepository({
    getItem: () => { throw new Error('Storage denied') },
    setItem: () => { writes += 1 },
    removeItem: () => {},
  })
  const result = repository.load(seed())
  assert.ok(result.error)
  assert.equal(result.recovery, null)
  assert.throws(() => repository.save(seed()), /protégée/)
  assert.equal(writes, 0)
})

test('a full or unavailable storage reports failure without replacing existing data', () => {
  const previous = 'existing backup'
  const storage = memoryStorage({ [STORAGE_KEY]: previous })
  const repository = createLocalRepository({
    ...storage,
    setItem: () => { throw new Error('QuotaExceededError') },
  })
  assert.throws(() => repository.save(seed()), /Enregistrement impossible/)
  assert.equal(storage.getItem(STORAGE_KEY), previous)
})

test('an explicit reset clears only the app backup and unblocks subsequent saves', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: 'broken backup', unrelated: 'keep me' })
  const repository = createLocalRepository(storage)
  repository.load(seed())
  repository.reset()
  assert.equal(storage.getItem(STORAGE_KEY), null)
  assert.equal(storage.getItem('unrelated'), 'keep me')
  assert.equal(repository.load(seed()).error, null)
  assert.doesNotThrow(() => repository.save(seed()))
  assert.deepEqual(createLocalRepository(storage).load([]).bivouacs, seed())
})

test('a failed reset retains the protected backup and does not unlock saving', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: 'broken backup' })
  const repository = createLocalRepository({
    ...storage,
    removeItem: () => { throw new Error('Reset denied') },
  })
  repository.load(seed())
  assert.throws(() => repository.reset(), /Reset denied/)
  assert.throws(() => repository.save(seed()), /protégée/)
  assert.equal(storage.getItem(STORAGE_KEY), 'broken backup')
})
