import catalogue from '../../data/photo-gallery.json'
import type { Bivouac } from '../types/bivouac'
import { getLocalPhoto, getPhotoUrl, localPhotoPath } from './photos'

export const PHOTO_VIEWS = ['exterior', 'interior', 'surroundings'] as const
export type PhotoView = (typeof PHOTO_VIEWS)[number]

/** Additional photograph of a catalogued place, downloaded as served by an openly licensed source. */
export interface GalleryPhoto {
  placeId: string
  name: string
  view: PhotoView
  url: string
  sourceUrl: string
  sourceTitle: string | null
  author: string | null
  license: string
  licenseUrl: string | null
  /** Capture date from the source metadata, when it exists. */
  takenOn: string | null
  /** Publication date of the comment holding the photo; the picture may be older. */
  publishedOn: string | null
  localPath: string
  width: number
  height: number
  bytes: number
  sha256: string
  checkedAt: string
}

/** One carousel slide. The cover has no audited view, so it stays unlabelled. */
export interface DisplayPhoto {
  src: string
  view: PhotoView | null
  author: string | null
  license: string | null
  licenseUrl: string | null
  sourceUrl: string | null
  /** Capture date if known, otherwise publication date. */
  date: string | null
}

const isPhotoView = (view: string): view is PhotoView => (PHOTO_VIEWS as readonly string[]).includes(view)
const galleryByPlace = new Map<string, GalleryPhoto[]>()
for (const photo of catalogue.photos) {
  if (!isPhotoView(photo.view) || !localPhotoPath.test(photo.localPath)) continue
  galleryByPlace.set(photo.placeId, [...galleryByPlace.get(photo.placeId) ?? [], { ...photo, view: photo.view }])
}
type PhotoReference = Pick<Bivouac, 'id' | 'imageUrl'>

export function getGalleryPhotos(bivouac: PhotoReference): readonly GalleryPhoto[] {
  // A replaced cover means we can no longer vouch that the gallery shows the same place.
  return getLocalPhoto(bivouac) ? galleryByPlace.get(bivouac.id) ?? [] : []
}

/** Cover first, then the audited gallery of the same catalogued place. */
export function getDisplayPhotos(bivouac: PhotoReference): DisplayPhoto[] {
  const local = getLocalPhoto(bivouac)
  const cover = getPhotoUrl(bivouac)
  return [
    ...cover ? [{ src: cover, view: null, author: local?.credit ?? null, license: null, licenseUrl: null, sourceUrl: local?.sourceUrl ?? null, date: null }] : [],
    ...getGalleryPhotos(bivouac).map(photo => ({
      src: photo.localPath, view: photo.view, author: photo.author, license: photo.license,
      licenseUrl: photo.licenseUrl, sourceUrl: photo.sourceUrl, date: photo.takenOn ?? photo.publishedOn,
    })),
  ]
}
