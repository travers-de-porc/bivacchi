import { useId, useState, type FormEvent } from 'react'
import { ArrowUpRight, Check, Clock3, ExternalLink, Heart, MapPin, Mountain, Pencil, Save, Tent, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { getSeasonProfile, isValidCoordinates, safeUrl } from '@/lib/csv'
import { formatHours, formatNumber } from '@/lib/utils'
import type { Bivouac, BivouacChanges, Season, SeasonalProfile } from '@/types/bivouac'

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
    if (!name) { setError('Le nom du bivouac est obligatoire.'); return }
    const altitude = text('altitudeM')
    const altitudeM = altitude === '' ? null : Number(altitude)
    if (altitudeM !== null && (!Number.isFinite(altitudeM) || altitudeM < 0 || altitudeM > 9000)) {
      setError('Renseignez une altitude valide, entre 0 et 9 000 mètres.'); return
    }
    const lat = text('lat'), lng = text('lng')
    if (Boolean(lat) !== Boolean(lng)) {
      setError('Renseignez ensemble la latitude et la longitude, ou laissez les deux champs vides.'); return
    }
    const coordinates = lat && lng ? { lat: Number(lat), lng: Number(lng) } : null
    if (coordinates && !isValidCoordinates(coordinates)) {
      setError('Les coordonnées doivent être des nombres : latitude entre −90 et 90, longitude entre −180 et 180.'); return
    }
    const saved = onSave({ name, sector: text('sector'), altitudeM, coordinates, description: text('description'), highlight: text('highlight'), personalNotes: text('personalNotes') })
    if (!saved) setError('La modification n’a pas pu être enregistrée. Vérifiez le message de stockage de l’application.')
  }
  return <form className="edit-form" onSubmit={submit}>
    <p className="notice">Vos modifications sont enregistrées sur cet appareil. Les lignes du fichier source restent conservées.</p>
    <div className="form-grid">
      <label className="field" htmlFor={`${formId}-name`}>Nom du bivouac<input id={`${formId}-name`} name="name" defaultValue={bivouac.name} required maxLength={300} autoFocus /></label>
      <label className="field" htmlFor={`${formId}-sector`}>Secteur<input id={`${formId}-sector`} name="sector" defaultValue={bivouac.sector} maxLength={300} /></label>
      <label className="field" htmlFor={`${formId}-altitude`}>Altitude (m)<input id={`${formId}-altitude`} name="altitudeM" type="number" min="0" max="9000" step="any" defaultValue={bivouac.altitudeM ?? ''} placeholder="Non renseignée" /></label>
      <label className="field" htmlFor={`${formId}-highlight`}>Ce qui donne envie<input id={`${formId}-highlight`} name="highlight" defaultValue={bivouac.highlight} maxLength={1000} /></label>
      <label className="field" htmlFor={`${formId}-lat`}>Latitude<input id={`${formId}-lat`} name="lat" type="number" min="-90" max="90" step="any" defaultValue={bivouac.coordinates?.lat ?? ''} placeholder="Non renseignée" /></label>
      <label className="field" htmlFor={`${formId}-lng`}>Longitude<input id={`${formId}-lng`} name="lng" type="number" min="-180" max="180" step="any" defaultValue={bivouac.coordinates?.lng ?? ''} placeholder="Non renseignée" /></label>
    </div>
    <label className="field" htmlFor={`${formId}-description`}>Description<textarea id={`${formId}-description`} name="description" rows={4} defaultValue={bivouac.description} /></label>
    <label className="field" htmlFor={`${formId}-notes`}>Mes notes personnelles<textarea id={`${formId}-notes`} name="personalNotes" rows={4} defaultValue={bivouac.personalNotes} placeholder="Une idée de sortie, un point à vérifier…" /></label>
    {error && <p className="notice" role="alert">{error}</p>}
    <div className="form-actions"><Button type="submit"><Save size={16} /> Enregistrer</Button><Button variant="ghost" onClick={onCancel}>Annuler</Button></div>
  </form>
}

function SeasonalDetails({ profile }: { profile: SeasonalProfile | undefined }) {
  if (!profile) return <p className="muted">Aucune donnée saisonnière renseignée.</p>
  const ratings: [string, number | null][] = [
    ['Intérêt pour la saison', profile.seasonRating], ['Isolement', profile.isolationRating],
    ['Probabilité d’être seul', profile.solitudeRating], ['Ambiance', profile.atmosphereRating],
    ['Vue', profile.viewRating], ['Rating global', profile.globalRating],
  ]
  return <>
    <div className="detail-stats">
      <div><Clock3 size={18} /><span>Montée estimée<strong>{formatHours(profile.ascentHours)}</strong></span></div>
      <div><TrendingUp size={18} /><span>Dénivelé estimé<strong>{formatNumber(profile.elevationGainM, ' m D+')}</strong></span></div>
      <div><MapPin size={18} /><span>Trajet voiture<strong>{profile.drivingTime || 'Non renseigné'}</strong></span></div>
    </div>
    <div className="detail-columns">
      <div><h4>Départ été</h4><p>{profile.summerDeparture || 'Non renseigné'}</p><p className="muted">Altitude : {formatNumber(profile.summerDepartureAltitudeM, ' m')}</p></div>
      <div><h4>Départ hiver</h4><p>{profile.winterDeparture || 'Non renseigné'}</p><p className="muted">Altitude : {formatNumber(profile.winterDepartureAltitudeM, ' m')}</p></div>
    </div>
    <p className="notice">Accès et évaluations issus du backlog, pour {profile.season ? `la saison ${profile.season.toLocaleLowerCase('fr')}` : 'une saison non précisée'}. Ce ne sont pas des observations datées des conditions sur place.</p>
    <h4>Évaluations du fichier source</h4>
    <dl className="detail-ratings">
      {ratings.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{formatNumber(value, ' / 5')}</dd></div>)}
      <div><dt>Score global précis</dt><dd>{formatNumber(profile.preciseScore)}</dd></div>
      <div><dt>Risque hiver (source)</dt><dd>{formatNumber(profile.winterRisk)}</dd></div>
      <div><dt>Cotation ski (source)</dt><dd>{profile.skiDifficulty || 'Non renseignée'}</dd></div>
    </dl>
    <div className="detail-section"><h4>Fiabilité déclarée</h4><p>{profile.reliability || 'Non renseignée dans le fichier source'}</p>
      {profile.sourceStatus && <p className="muted">État d’origine : {profile.sourceStatus}</p>}
    </div>
    <div className="detail-section"><h4>Notes originales</h4><p className="whitespace-pre-wrap">{profile.originalNotes || 'Aucune note dans cette ligne source.'}</p></div>
  </>
}

export function BivouacDetail({ bivouac, onClose, onUpdate, initialSeason }: BivouacDetailProps) {
  const [editing, setEditing] = useState(false)
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [profileIndex, setProfileIndex] = useState(() => {
    const initial = getSeasonProfile(bivouac, initialSeason)
    return initial ? bivouac.seasons.indexOf(initial) : 0
  })
  const profile = bivouac.seasons[profileIndex]
  const image = safeUrl(bivouac.imageUrl)
  const links: [string, string | null][] = [
    ['Fiche officielle', bivouac.links.official], ['Ouvrir Google Maps', bivouac.links.maps],
    ['Photos et galerie', bivouac.links.gallery], ['Source altitude / accès', bivouac.links.accessSource],
    ['Source de la cotation ski', bivouac.links.skiSource],
  ]
  function update(changes: BivouacChanges) {
    const saved = onUpdate(bivouac.id, changes)
    setError(saved ? '' : 'Enregistrement impossible. Vérifiez le message de stockage de l’application.')
    return saved
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }} title={bivouac.name} description={bivouac.sector || 'Secteur non renseigné'} className="detail-dialog">
    <div className="detail-hero">
      {image && failedImage !== image ? <img className="detail-cover" src={image} alt={bivouac.name} referrerPolicy="no-referrer" onError={() => setFailedImage(image)} /> : <div className="detail-placeholder"><Mountain size={64} strokeWidth={1} /><span>Le prochain horizon</span><small>Photo non disponible</small></div>}
      <span className="tag"><Mountain size={14} /> {formatNumber(bivouac.altitudeM, ' m')}</span>
    </div>
    <div className="detail-body">
      <div className="detail-actions">
        <Button variant={bivouac.wishlist ? 'default' : 'outline'} aria-pressed={bivouac.wishlist} onClick={() => update({ wishlist: !bivouac.wishlist })}><Heart size={16} fill={bivouac.wishlist ? 'currentColor' : 'none'} /> {bivouac.wishlist ? 'Dans mes envies' : 'Ajouter à mes envies'}</Button>
        <Button variant={bivouac.visited ? 'secondary' : 'outline'} aria-pressed={bivouac.visited} onClick={() => update({ visited: !bivouac.visited })}>{bivouac.visited ? <Check size={16} /> : <Tent size={16} />} {bivouac.visited ? 'Déjà visité' : 'Marquer comme visité'}</Button>
        <Button variant="ghost" aria-pressed={editing} onClick={() => setEditing(!editing)}><Pencil size={16} /> {editing ? 'Fermer l’édition' : 'Modifier'}</Button>
      </div>
      {error && <p className="notice" role="alert">{error}</p>}
      {editing ? <EditForm bivouac={bivouac} onCancel={() => setEditing(false)} onSave={(changes) => { const saved = update(changes); if (saved) setEditing(false); return saved }} /> : <>
        <section className="detail-section">
          <p className="eyebrow">L’esprit du lieu</p>
          {bivouac.highlight && <h3 className="detail-title">{bivouac.highlight}</h3>}
          <p className="whitespace-pre-wrap">{bivouac.description || 'Description non renseignée.'}</p>
        </section>
        <section className="detail-section"><h3>Préparer l’approche</h3>
          <div className="season-tabs" role="group" aria-label="Saison des données affichées">
            {bivouac.seasons.map((item, index) => <button type="button" key={`${item.season}-${index}`} aria-pressed={profileIndex === index} className={profileIndex === index ? 'active' : ''} onClick={() => setProfileIndex(index)}>{item.season || 'Sans saison'}</button>)}
          </div>
          <SeasonalDetails profile={profile} />
        </section>
        <section className="detail-section"><h3>Mes notes</h3><p className="whitespace-pre-wrap">{bivouac.personalNotes || 'Pas encore de note personnelle.'}</p><Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil size={14} /> {bivouac.personalNotes ? 'Modifier mes notes' : 'Ajouter une note'}</Button></section>
        <section className="detail-section"><h3>Localisation et sources</h3>
          <p className="muted">{bivouac.coordinates ? `Coordonnées : ${bivouac.coordinates.lat}, ${bivouac.coordinates.lng}` : 'Coordonnées non renseignées : ce lieu n’a pas de marqueur sur la carte.'}</p>
          <div className="detail-links">{links.map(([label, value]) => { const href = safeUrl(value); return href ? <a key={label} href={href} target="_blank" rel="noopener noreferrer">{label}<ArrowUpRight size={16} /></a> : null })}</div>
          {!links.some(([, value]) => safeUrl(value)) && <p className="muted">Aucun lien source renseigné.</p>}
        </section>
        <section className="detail-section"><h3>Données originales</h3><p className="muted">Chaque ligne est conservée telle qu’importée, y compris les attributs supplémentaires.</p>
          {bivouac.rawRecords.map((record, index) => <details className="source-record" key={`${record.source}-${record.sheet}-${record.row}-${index}`}>
            <summary>{record.sheet || 'Import CSV'} · ligne {record.row}<span className="muted"> — {record.source}</span></summary>
            <table className="source-table"><caption className="sr-only">Attributs originaux de {record.source}, ligne {record.row}</caption><tbody>{Object.entries(record.values).map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td className="whitespace-pre-wrap">{safeUrl(value) ? <a href={safeUrl(value) ?? undefined} target="_blank" rel="noopener noreferrer">{value} <ExternalLink size={12} /></a> : value || '—'}</td></tr>)}</tbody></table>
          </details>)}
        </section>
      </>}
    </div>
  </Dialog>
}
