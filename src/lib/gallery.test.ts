import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import test from 'node:test'
import covers from '../../data/photos.json'
import gallery from '../../data/photo-gallery.json'
import { parseBivouacsCsv, safeUrl } from './csv'
import { getDisplayPhotos, getGalleryPhotos, PHOTO_VIEWS } from './gallery'
import { getPhotoUrl } from './photos'
import { pwaOptions } from '../../pwa.config'

const seed = parseBivouacsCsv(readFileSync(new URL('../../data/Bivacco_Explorer_enrichi.csv', import.meta.url), 'utf8')).bivouacs

test('gallery bytes match the audited catalogue and fit in the offline cache', () => {
  assert.equal(gallery.version, 1)
  for (const photo of gallery.photos) {
    const bytes = readFileSync(new URL(`../../public${photo.localPath}`, import.meta.url))
    assert.equal(bytes.length, photo.bytes, photo.localPath)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), photo.sha256, photo.localPath)
    assert.ok(photo.width > 0 && photo.height > 0)
    assert.ok(bytes.length <= pwaOptions.workbox!.maximumFileSizeToCacheInBytes!, photo.localPath)
  }
})

test('gallery photos belong to known places, keep their licence and never duplicate a file', () => {
  const ids = new Set(seed.map(place => place.id))
  const hashes = new Set(covers.photos.map(photo => photo.sha256))
  const perPlace = new Map<string, number>()
  for (const photo of gallery.photos) {
    assert.ok(ids.has(photo.placeId), photo.placeId)
    assert.ok((PHOTO_VIEWS as readonly string[]).includes(photo.view), photo.view)
    assert.ok(photo.license.trim(), photo.localPath)
    assert.ok(safeUrl(photo.url) && safeUrl(photo.sourceUrl), photo.localPath)
    assert.ok(photo.licenseUrl === null || safeUrl(photo.licenseUrl), photo.localPath)
    assert.ok(photo.localPath.startsWith(`/images/bivouacs/${photo.placeId}-${photo.view}-${photo.sha256.slice(0, 12)}.`), photo.localPath)
    assert.ok(!hashes.has(photo.sha256), `Duplicate file: ${photo.localPath}`)
    hashes.add(photo.sha256)
    perPlace.set(photo.placeId, (perPlace.get(photo.placeId) ?? 0) + 1)
  }
  assert.ok(Math.max(...perPlace.values()) <= 4)
  assert.ok(gallery.photos.some(photo => photo.view === 'interior'))
})

test('the carousel shows the cover first, then the place gallery in catalogue order', () => {
  const place = seed.find(item => item.name === 'Bivouac du Dolent CAS')!
  const slides = getDisplayPhotos(place)
  const photos = gallery.photos.filter(photo => photo.placeId === place.id)
  assert.ok(photos.some(photo => photo.view === 'interior'))
  assert.equal(slides[0].src, getPhotoUrl(place))
  assert.equal(slides[0].view, null)
  assert.deepEqual(slides.slice(1).map(slide => [slide.src, slide.view]), photos.map(photo => [photo.localPath, photo.view]))
  assert.ok(slides.slice(1).every(slide => slide.license && slide.sourceUrl))
})

test('a replaced cover or an unknown place never inherits a catalogued gallery', () => {
  const place = seed.find(item => getGalleryPhotos(item).length)!
  const custom = { ...place, imageUrl: 'https://example.com/ma-photo.jpg' }
  assert.deepEqual(getGalleryPhotos(custom), [])
  assert.deepEqual(getDisplayPhotos(custom).map(slide => slide.src), ['https://example.com/ma-photo.jpg'])
  assert.deepEqual(getDisplayPhotos({ id: 'un-autre-abri', imageUrl: null }), [])
})
