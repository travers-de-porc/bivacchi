import { useId, useState, type FormEvent } from 'react'
import { ArrowUpRight, Check, Clock3, ExternalLink, Heart, MapPin, Mountain, Pencil, Save, Tent, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { PhotoCarousel } from '@/components/PhotoCarousel'
import { getSeasonProfile, isValidCoordinates, safeUrl } from '@/lib/csv'
import { getEnrichment } from '@/lib/enrichment'
import { getDisplayPhotos } from '@/lib/gallery'
import { getLocalPhoto } from '@/lib/photos'
import { formatHours, formatNumber } from '@/lib/utils'
import type { Bivouac, BivouacChanges, Season, SeasonalProfile, SourceRecord } from '@/types/bivouac'

interface BivouacDetailProps {
  bivouac: Bivouac
  onClose: () => void
  onUpdate: (id: string, changes: BivouacChanges) => boolean
  initialSeason: Season | 'all'
}

function EditForm({ bivouac, onSave, onCancel }: {
  bivouac: Bivouac
  onSave: (changes: BivouacChanges) => boolean
  onCancel: () => void
}) {
  const [error, setError] = useState('')
  const formId = useId()
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const text = (name: string) => String(data.get(name) ?? '').trim()
    const name = text('name')
    if (!name) { setError('Un bivouac sans nom, c’est juste un caillou. Le nom est obligatoire.'); return }
    const altitude = text('altitudeM')
    const altitudeM = altitude === '' ? null : Number(altitude)
    if (altitudeM !== null && (!Number.isFinite(altitudeM) || altitudeM < 0 || altitudeM > 9000)) {
      setError('Altitude entre 0 et 9 000 mètres, s’il vous plaît. On est ambitieux, pas à ce point.'); return
    }
    const lat = text('lat'), lng = text('lng')
    if (Boolean(lat) !== Boolean(lng)) {
      setError('Une latitude sans longitude, c’est un demi-bivouac. Renseignez ensemble la latitude et la longitude, ou laissez les deux vides.'); return
    }
    const coordinates = lat && lng ? { lat: Number(lat), lng: Number(lng) } : null
    if (coordinates && !isValidCoordinates(coordinates)) {
      setError('Même nous, on ne se perd pas à ce point : latitude entre −90 et 90, longitude entre −180 et 180.'); return
    }
    const saved = onSave({ name, sector: text('sector'), altitudeM, coordinates, description: text('description'), highlight: text('highlight'), personalNotes: text('personalNotes') })
    if (!saved) setError('Raté : rien n’a été enregistré. Le message d’alerte sur la page principale explique pourquoi.')
  }
  return <form className="edit-form" onSubmit={submit}>
    <p className="notice">Vos corrections restent sur cet appareil. Les lignes du fichier source, elles, ne bougent pas. Au cas où.</p>
    <div className="form-grid">
      <label className="field" htmlFor={`${formId}-name`}>Nom du bivouac<input id={`${formId}-name`} name="name" defaultValue={bivouac.name} required maxLength={300} autoFocus /></label>
      <label className="field" htmlFor={`${formId}-sector`}>Secteur<input id={`${formId}-sector`} name="sector" defaultValue={bivouac.sector} maxLength={300} /></label>
      <label className="field" htmlFor={`${formId}-altitude`}>Altitude (m)<input id={`${formId}-altitude`} name="altitudeM" type="number" min="0" max="9000" step="any" defaultValue={bivouac.altitudeM ?? ''} placeholder="Aucune idée" /></label>
      <label className="field" htmlFor={`${formId}-highlight`}>Ce qui donne envie<input id={`${formId}-highlight`} name="highlight" defaultValue={bivouac.highlight} maxLength={1000} /></label>
      <label className="field" htmlFor={`${formId}-lat`}>Latitude<input id={`${formId}-lat`} name="lat" type="number" min="-90" max="90" step="any" defaultValue={bivouac.coordinates?.lat ?? ''} placeholder="Aucune idée" /></label>
      <label className="field" htmlFor={`${formId}-lng`}>Longitude<input id={`${formId}-lng`} name="lng" type="number" min="-180" max="180" step="any" defaultValue={bivouac.coordinates?.lng ?? ''} placeholder="Aucune idée" /></label>
    </div>
    <label className="field" htmlFor={`${formId}-description`}>Description<textarea id={`${formId}-description`} name="description" rows={4} defaultValue={bivouac.description} /></label>
    <label className="field" htmlFor={`${formId}-notes`}>Mes notes personnelles<textarea id={`${formId}-notes`} name="personalNotes" rows={4} defaultValue={bivouac.personalNotes} placeholder="Ne pas oublier le tire-bouchon. Cette fois-ci." /></label>
    {error && <p className="notice" role="alert">{error}</p>}
    <div className="form-actions"><Button type="submit"><Save size={16} /> Enregistrer</Button><Button variant="ghost" onClick={onCancel}>Annuler</Button></div>
  </form>
}

function ComplementNotice({ source, date }: { source: string; date: string | null }) {
  const href = safeUrl(source)
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : date
  return <p className="notice">Accès complété{day ? ` le ${day}` : ''} d’après {href
    ? <a className="inline-flex items-center gap-1 underline" href={href} target="_blank" rel="noopener noreferrer">{new URL(href).hostname.replace(/^www\./, '')}<ExternalLink size={12} aria-hidden="true" /></a>
    : source}. Durée de fiche officielle : elle suppose qu’on ne s’arrête pas à chaque replat pour sortir le saucisson.</p>
}

function SeasonalDetails({ profile }: { profile: SeasonalProfile | undefined }) {
  if (!profile) return <p className="muted">Aucune donnée de saison pour ce lieu. Le fichier source est resté muet.</p>
  const ratings: [string, number | null][] = [
    ['Intérêt pour la saison', profile.seasonRating], ['Isolement', profile.isolationRating],
    ['Probabilité d’être seul', profile.solitudeRating], ['Ambiance', profile.atmosphereRating],
    ['Vue', profile.viewRating], ['Note globale', profile.globalRating],
  ]
  return <>
    <div className="detail-stats">
      <div><Clock3 size={18} /><span>Montée estimée<strong>{formatHours(profile.ascentHours)}</strong></span></div>
      <div><TrendingUp size={18} /><span>Dénivelé estimé<strong>{formatNumber(profile.elevationGainM, ' m D+')}</strong></span></div>
      <div><MapPin size={18} /><span>Trajet voiture<strong>{profile.drivingTime || 'Aucune idée'}</strong></span></div>
    </div>
    <div className="detail-columns">
      <div><h4>Départ été</h4><p>{profile.summerDeparture || 'Aucune idée'}</p><p className="muted">Altitude : {formatNumber(profile.summerDepartureAltitudeM, ' m')}</p></div>
      <div><h4>Départ hiver</h4><p>{profile.winterDeparture || 'Aucune idée'}</p><p className="muted">Altitude : {formatNumber(profile.winterDepartureAltitudeM, ' m')}</p></div>
    </div>
    {profile.route && <div className="detail-section"><h4>L’itinéraire</h4><p className="whitespace-pre-wrap">{profile.route}</p></div>}
    {profile.complementSource && <ComplementNotice source={profile.complementSource} date={profile.complementDate} />}
    <p className="notice">{profile.complementSource ? 'Évaluations tirées' : 'Accès et évaluations tirés'} du backlog, pour {profile.season ? `la saison ${profile.season.toLocaleLowerCase('fr')}` : 'une saison non précisée'}. Ce n’est pas un bulletin des conditions : personne n’est monté vérifier ce matin.</p>
    <h4>Évaluations du fichier source (pas des avis du jour)</h4>
    <dl className="detail-ratings">
      {ratings.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{formatNumber(value, ' / 5')}</dd></div>)}
      <div><dt>Score global précis</dt><dd>{formatNumber(profile.preciseScore)}</dd></div>
      <div><dt>Risque hiver (source)</dt><dd>{formatNumber(profile.winterRisk)}</dd></div>
      <div><dt>Cotation ski (source)</dt><dd>{profile.skiDifficulty || 'Aucune idée'}</dd></div>
    </dl>
    <div className="detail-section"><h4>Fiabilité déclarée</h4><p>{profile.reliability || 'Le fichier source ne dit rien.'}</p>
      {profile.sourceStatus && <p className="muted">État d’origine : {profile.sourceStatus}</p>}
    </div>
    <div className="detail-section"><h4>Notes originales</h4><p className="whitespace-pre-wrap">{profile.originalNotes || 'Aucune note dans cette ligne source. Silence radio.'}</p></div>
  </>
}

function SourceDetails({ record, title, hideControlMetadata = false }: { record: SourceRecord; title?: string; hideControlMetadata?: boolean }) {
  const fields = Object.entries(record.values).filter(([label]) => !hideControlMetadata || !['Sources et contrôles [données]', 'Sources et contrôles [source]', 'Sources et contrôles [ligne]'].includes(label))
  return <details className="source-record">
    <summary>{title || record.sheet || 'Import CSV'} · ligne {record.row}<span className="muted"> — {record.source}</span></summary>
    <table className="source-table"><caption className="sr-only">Attributs originaux de {record.source}, ligne {record.row}</caption><tbody>{fields.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td className="whitespace-pre-wrap">{safeUrl(value) ? <a href={safeUrl(value) ?? undefined} target="_blank" rel="noopener noreferrer">{value} <ExternalLink size={12} /></a> : value || '—'}</td></tr>)}</tbody></table>
  </details>
}

export function BivouacDetail({ bivouac, onClose, onUpdate, initialSeason }: BivouacDetailProps) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [profileIndex, setProfileIndex] = useState(() => {
    const initial = getSeasonProfile(bivouac, initialSeason)
    return initial ? bivouac.seasons.indexOf(initial) : 0
  })
  const profile = bivouac.seasons[profileIndex]
  const localPhoto = getLocalPhoto(bivouac)
  const enrichment = getEnrichment(bivouac)
  const changedCoordinates = enrichment.coordinates !== null && (bivouac.coordinates?.lat !== enrichment.coordinates.lat || bivouac.coordinates?.lng !== enrichment.coordinates.lng)
  const links: [string, string | null][] = [
    ['Fiche officielle', bivouac.links.official], ['Ouvrir Google Maps', bivouac.links.maps],
    ['Photos et galerie', bivouac.links.gallery], ['Source altitude / accès', bivouac.links.accessSource],
    ['Source de la cotation ski', bivouac.links.skiSource],
    ['Source des coordonnées GPS', enrichment.gpsSource], ['Position du fichier source sur Google Maps', enrichment.gpsMapsUrl],
    ['Source de la photo', enrichment.photoSource],
    ['Source de la photo locale', localPhoto?.sourceUrl ?? null],
  ]
  function update(changes: BivouacChanges) {
    const saved = onUpdate(bivouac.id, changes)
    setError(saved ? '' : 'Raté : rien n’a été enregistré. Le message d’alerte sur la page principale explique pourquoi.')
    return saved
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }} title={bivouac.name} description={bivouac.sector || 'Secteur : aucune idée'} className="detail-dialog">
    <div className="detail-hero">
      <PhotoCarousel variant="detail" photos={getDisplayPhotos(bivouac)} name={bivouac.name}
        placeholder={<div className="detail-placeholder"><Mountain size={64} strokeWidth={1} /><span>Il faudra monter voir.</span><small>Photo aux abonnés absents</small></div>}>
        <span className="tag"><Mountain size={14} /> {formatNumber(bivouac.altitudeM, ' m')}</span>
      </PhotoCarousel>
    </div>
    <div className="detail-body">
      <div className="detail-actions">
        <Button variant={bivouac.wishlist ? 'default' : 'outline'} aria-pressed={bivouac.wishlist} onClick={() => update({ wishlist: !bivouac.wishlist })}><Heart size={16} fill={bivouac.wishlist ? 'currentColor' : 'none'} /> {bivouac.wishlist ? 'Dans mes envies' : 'Ajouter à mes envies'}</Button>
        <Button variant={bivouac.visited ? 'secondary' : 'outline'} aria-pressed={bivouac.visited} onClick={() => update({ visited: !bivouac.visited })}>{bivouac.visited ? <Check size={16} /> : <Tent size={16} />} {bivouac.visited ? 'Fait, et bien mangé' : 'Marquer comme fait'}</Button>
        <Button variant="ghost" aria-pressed={editing} onClick={() => setEditing(!editing)}><Pencil size={16} /> {editing ? 'Fermer l’édition' : 'Modifier'}</Button>
      </div>
      {error && <p className="notice" role="alert">{error}</p>}
      {editing ? <EditForm bivouac={bivouac} onCancel={() => setEditing(false)} onSave={(changes) => { const saved = update(changes); if (saved) setEditing(false); return saved }} /> : <>
        <section className="detail-section">
          <p className="eyebrow">Pourquoi on y va</p>
          {bivouac.highlight && <h3 className="detail-title">{bivouac.highlight}</h3>}
          <p className="whitespace-pre-wrap">{bivouac.description || 'Pas de description : on devait être à l’apéro.'}</p>
        </section>
        <section className="detail-section"><h3>La montée, en théorie</h3>
          <div className="season-tabs" role="group" aria-label="Saison des données affichées">
            {bivouac.seasons.map((item, index) => <button type="button" key={`${item.season}-${index}`} aria-pressed={profileIndex === index} className={profileIndex === index ? 'active' : ''} onClick={() => setProfileIndex(index)}>{item.season || 'Sans saison'}</button>)}
          </div>
          <SeasonalDetails profile={profile} />
        </section>
        <section className="detail-section"><h3>Mes notes</h3><p className="whitespace-pre-wrap">{bivouac.personalNotes || 'Rien pour l’instant. Même pas une liste de courses.'}</p><Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil size={14} /> {bivouac.personalNotes ? 'Modifier mes notes' : 'Ajouter une note'}</Button></section>
        <section className="detail-section"><h3>Où c’est, et qui le dit</h3>
          <p className="muted">{bivouac.coordinates ? `Coordonnées : ${bivouac.coordinates.lat}, ${bivouac.coordinates.lng}` : 'Pas de coordonnées, donc pas de marqueur sur la carte : on ne place pas les bivouacs au pif.'}</p>
          {changedCoordinates && <p className="notice">Coordonnées modifiées par vos soins. La fiabilité GPS déclarée, elle, concerne la position du fichier source.</p>}
          {enrichment.gpsReliability && <p className="notice">Fiabilité GPS déclarée : {enrichment.gpsReliability}</p>}
          {enrichment.gpsSource && !safeUrl(enrichment.gpsSource) && <p className="muted">Source GPS : {enrichment.gpsSource}</p>}
          {localPhoto?.credit && <p className="muted">Crédit photo : {localPhoto.credit}</p>}
          <div className="detail-links">{links.map(([label, value]) => { const href = safeUrl(value); return href ? <a key={label} href={href} target="_blank" rel="noopener noreferrer">{label}<ArrowUpRight size={16} /></a> : null })}</div>
          {!links.some(([, value]) => safeUrl(value)) && <p className="muted">Aucun lien source. Prudence, donc.</p>}
        </section>
        <section className="detail-section"><h3>Données originales</h3><p className="muted">Chaque ligne telle qu’importée, colonnes en trop comprises. On ne jette rien.</p>
          {enrichment.control && <SourceDetails record={enrichment.control} title="Sources et contrôles" />}
          {bivouac.rawRecords.map((record, index) => <SourceDetails record={record} hideControlMetadata={enrichment.control !== null} key={`${record.source}-${record.sheet}-${record.row}-${index}`} />)}
        </section>
      </>}
    </div>
  </Dialog>
}
