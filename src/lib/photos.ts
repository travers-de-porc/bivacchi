import catalogue from '../../data/photos.json'
import type { Bivouac } from '../types/bivouac'
import { safeUrl } from './csv'

export interface LocalPhoto {
  id: string
  name: string
  originalUrl: string | null
  url: string
  sourceUrl: string
  localPath: string
  width: number
  height: number
  bytes: number
  sha256: string
  checkedAt: string
  credit: string | null
}

const photos: readonly LocalPhoto[] = catalogue.photos
const photosById = new Map(photos.map(photo => [photo.id, photo]))
const localPhotoPath = /^\/images\/bivouacs\/[a-z0-9][a-z0-9._-]*\.(?:avif|gif|jpe?g|png|webp)$/i
type PhotoReference = Pick<Bivouac, 'id' | 'imageUrl'>

/** Local assets replace known source photographs without overwriting imported evidence. */
export function getLocalPhoto(bivouac: PhotoReference): LocalPhoto | null {
  const photo = photosById.get(bivouac.id)
  if (!photo || !localPhotoPath.test(photo.localPath)) return null
  const originalUrl = photo.originalUrl === null ? null : safeUrl(photo.originalUrl)
  const imageUrl = bivouac.imageUrl === null ? null : safeUrl(bivouac.imageUrl)
  if (bivouac.imageUrl === photo.localPath ||
    (bivouac.imageUrl === null && photo.originalUrl === null) ||
    (imageUrl !== null && (imageUrl === originalUrl || imageUrl === safeUrl(photo.url)))) return photo
  return null
}

/** Unknown user imports keep their own photo; relative paths never gain a general exception. */
export function getPhotoUrl(bivouac: PhotoReference): string | null {
  return getLocalPhoto(bivouac)?.localPath ?? safeUrl(bivouac.imageUrl)
}
