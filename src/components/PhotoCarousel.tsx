import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Mountain } from 'lucide-react'
import type { DisplayPhoto, PhotoView } from '../lib/gallery'
import { safeUrl } from '../lib/csv'
import './PhotoCarousel.css'

const VIEW_LABELS: Record<PhotoView, string> = {
  exterior: 'Extérieur',
  interior: 'Intérieur',
  surroundings: 'Alentours',
}

function creditText(photo: DisplayPhoto): string | undefined {
  if (!photo.author && !photo.license) return undefined
  return [photo.author ? `Photo : ${photo.author}` : 'Photo', photo.license, photo.date?.slice(0, 4)].filter(Boolean).join(' · ')
}

function Credit({ photo }: { photo: DisplayPhoto }) {
  const source = safeUrl(photo.sourceUrl)
  const license = safeUrl(photo.licenseUrl)
  const year = photo.date?.slice(0, 4)
  return <p className="photo-carousel-credit">
    <span>{photo.author ? `Photo : ${photo.author}` : 'Photo'}</span>
    {photo.license && <> · {license ? <a href={license} target="_blank" rel="noopener noreferrer license">{photo.license}</a> : photo.license}</>}
    {year && <> · {year}</>}
    {source && <> · <a href={source} target="_blank" rel="noopener noreferrer">source<ExternalLink size={10} aria-hidden="true" /></a></>}
  </p>
}

interface PhotoCarouselProps {
  photos: DisplayPhoto[]
  name: string
  /** Popup and details show the credit under the photo; mosaic cards keep it in a tooltip and in the details. */
  variant: 'popup' | 'card' | 'detail'
  /** Makes the photo itself open the details, as the mosaic image did. */
  onOpen?: () => void
  /** Shown when there is no photo, or when one fails to load. */
  placeholder?: ReactNode
  /** Overlays drawn over the photos, such as the altitude tag. */
  children?: ReactNode
}

/** Native scroll-snap carousel: swipe on touch, buttons and arrow keys elsewhere. */
export function PhotoCarousel({ photos, name, variant, onOpen, placeholder, children }: PhotoCarouselProps) {
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set())
  const fallback = placeholder ?? <div className="photo-carousel-missing"><Mountain size={30} strokeWidth={1} aria-hidden="true" /><span>Photo aux abonnés absents</span></div>
  const openable = (content: ReactNode) => onOpen
    ? <button type="button" className="photo-carousel-open" aria-label={`Découvrir ${name}`} onClick={onOpen}>{content}</button>
    : content
  if (!photos.length) {
    return <div className={`photo-carousel is-${variant} is-empty`}><div className="photo-carousel-frame">{openable(fallback)}{children}</div></div>
  }
  const current = photos[Math.min(index, photos.length - 1)]
  const go = (next: number) => {
    const element = track.current
    if (!element) return
    const target = Math.max(0, Math.min(photos.length - 1, next))
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // The scroll handler updates the index, so swipes and buttons share one source of truth.
    element.scrollTo({ left: target * element.clientWidth, behavior: smooth ? 'smooth' : 'auto' })
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    event.stopPropagation()
    go(index + (event.key === 'ArrowRight' ? 1 : -1))
  }
  return <div className={`photo-carousel is-${variant}`} role="region" aria-roledescription="carrousel" aria-label={`Photos de ${name}`} onKeyDown={onKeyDown}>
    <div className="photo-carousel-frame">
      <div
        ref={track}
        className="photo-carousel-track"
        onScroll={(event) => {
          const element = event.currentTarget
          if (element.clientWidth) setIndex(Math.round(element.scrollLeft / element.clientWidth))
        }}
      >
        {photos.map((photo, position) => <figure
          key={photo.src}
          className="photo-carousel-slide"
          role="group"
          aria-roledescription="diapositive"
          aria-label={`${position + 1} sur ${photos.length}`}
          // Hidden slides leave the tab order and the accessibility tree; swipes still scroll the track.
          inert={position !== index}
        >
          {openable(failed.has(photo.src)
            ? fallback
            : <img
              src={photo.src}
              alt={photo.view ? `${name} — ${VIEW_LABELS[photo.view].toLocaleLowerCase('fr')}` : name}
              title={variant === 'card' ? creditText(photo) : undefined}
              loading={position === 0 && variant !== 'card' ? 'eager' : 'lazy'}
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setFailed((previous) => new Set(previous).add(photo.src))}
            />)}
        </figure>)}
      </div>
      {photos.length > 1 && <>
        <button type="button" className="photo-carousel-button is-previous" aria-label="Photo précédente" disabled={index === 0} onClick={() => go(index - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
        <button type="button" className="photo-carousel-button is-next" aria-label="Photo suivante" disabled={index >= photos.length - 1} onClick={() => go(index + 1)}><ChevronRight size={18} aria-hidden="true" /></button>
      </>}
      {(current.view || photos.length > 1) && <div className="photo-carousel-meta">
        {current.view && <span className="photo-carousel-view" aria-hidden="true">{VIEW_LABELS[current.view]}</span>}
        {photos.length > 1 && <span className="photo-carousel-count" aria-live="polite">{index + 1} / {photos.length}</span>}
      </div>}
      {children}
    </div>
    {variant !== 'card' && <Credit photo={current} />}
  </div>
}
