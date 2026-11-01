import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import test from 'node:test'
import catalogue from '../../data/photos.json'
import { parseBivouacsCsv, safeUrl } from './csv'
import { getLocalPhoto, getPhotoUrl } from './photos'
import { pwaOptions } from '../../pwa.config'

const seed = parseBivouacsCsv(readFileSync(new URL('../../data/Bivacco_Explorer_enrichi.csv', import.meta.url), 'utf8')).bivouacs

test('bundled photo bytes match the audited catalogue and all fit in the offline cache', () => {
  for (const photo of catalogue.photos) {
    const bytes = readFileSync(new URL(`../../public${photo.localPath}`, import.meta.url))
    assert.equal(bytes.length, photo.bytes, photo.name)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), photo.sha256, photo.name)
    assert.ok(photo.localPath.includes(photo.sha256.slice(0, 12)))
    assert.ok(photo.width > 0 && photo.height > 0)
    assert.ok(bytes.length <= pwaOptions.workbox!.maximumFileSizeToCacheInBytes!, photo.name)
  }
})

test('every bundled place resolves to its own local photo without changing source records', () => {
  const original = structuredClone(seed)
  assert.equal(catalogue.version, 1)
  assert.equal(catalogue.photos.length, 57)
  assert.equal(new Set(catalogue.photos.map(photo => photo.id)).size, 57)
  for (const place of seed) {
    const photo = getLocalPhoto(place)
    assert.ok(photo, `Missing local photo for ${place.name}`)
    assert.equal(photo.id, place.id)
    assert.match(getPhotoUrl(place)!, /^\/images\/bivouacs\/[^/]+\.(?:avif|gif|jpe?g|png|webp)$/i)
    assert.ok(safeUrl(photo.url))
    assert.ok(safeUrl(photo.sourceUrl))
  }
  assert.deepEqual(seed, original)
})

test('Resegotti uses the supplied image even though its original source has no photograph', () => {
  const place = seed.find(item => item.name === 'Capanna Luigina Resegotti')!
  assert.equal(place.imageUrl, null)
  const photo = getLocalPhoto(place)!
  assert.equal(photo.originalUrl, null)
  assert.equal(photo.url, 'https://www.loscarpone.cai.it/Sites/435/Media/2025/04/Resegotti%20(118).jpg')
  assert.equal(getPhotoUrl(place), photo.localPath)
})

test('renamed saved places and known corrected URLs keep their local photograph', () => {
  const place = seed.find(item => item.imageUrl)!
  const photo = getLocalPhoto(place)!
  const renamed = { ...place, name: 'Un nom corrigé dans mon carnet' }
  assert.equal(getPhotoUrl(renamed), photo.localPath)
  assert.equal(getPhotoUrl({ id: place.id, imageUrl: photo.url }), photo.localPath)
  assert.equal(getPhotoUrl({ id: place.id, imageUrl: photo.localPath }), photo.localPath)
})

test('custom imports never inherit a catalogued photograph or its provenance', () => {
  const place = seed.find(item => item.imageUrl)!
  const custom = { ...place, imageUrl: 'https://example.com/ma-photo.jpg' }
  assert.equal(getLocalPhoto(custom), null)
  assert.equal(getPhotoUrl(custom), custom.imageUrl)
  assert.equal(getLocalPhoto({ id: 'un-autre-abri', imageUrl: place.imageUrl }), null)
  assert.equal(getPhotoUrl({ id: 'un-autre-abri', imageUrl: null }), null)
})

test('unsafe and uncatalogued relative image URLs stay rejected', () => {
  const place = seed.find(item => item.imageUrl)!
  for (const imageUrl of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', '//example.com/image.jpg', '/images/bivouacs/inconnue.jpg', '/private/photo.jpg']) {
    assert.equal(getLocalPhoto({ ...place, imageUrl }), null)
    assert.equal(getPhotoUrl({ ...place, imageUrl }), null)
  }
})
