import { useState } from 'react'
import { ArrowUpRight, Bookmark, Check, Clock3, Mountain, MoveUpRight, MapPin, Tent } from 'lucide-react'
import type { Bivouac, BivouacChanges, Season } from '@/types/bivouac'
import { getSeasonProfile } from '@/lib/csv'
import { formatHours, formatNumber } from '@/lib/utils'
import { Button } from './ui/button'

export function BivouacImage({ bivouac, className = '' }: { bivouac: Bivouac; className?: string }) {
  const [failed, setFailed] = useState(false)
  return <div className={`bivouac-image ${className}`}>
    {bivouac.imageUrl && !failed ? <img src={bivouac.imageUrl} alt={bivouac.name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      : <div className="image-placeholder"><Mountain strokeWidth={0.8} size={76} /><span>Photo aux abonnés absents</span></div>}
  </div>
}
export function BivouacCard({ bivouac, season, onOpen, onUpdate }: {
  bivouac: Bivouac; season: Season | 'all'; onOpen: (id: string) => void; onUpdate: (id: string, changes: BivouacChanges) => boolean
}) {
  const profile = getSeasonProfile(bivouac, season)
  return <article className="bivouac-card">
    <div className="card-visual">
      <button className="image-link" onClick={() => onOpen(bivouac.id)} aria-label={`Découvrir ${bivouac.name}`}><BivouacImage bivouac={bivouac} /></button>
      <span className="altitude-badge"><Mountain size={13} /> {bivouac.altitudeM === null ? 'Altitude : aucune idée' : formatNumber(bivouac.altitudeM, ' m')}</span>
      <button className={`bookmark-button ${bivouac.wishlist ? 'is-saved' : ''}`} aria-label={`${bivouac.wishlist ? 'Retirer' : 'Ajouter'} ${bivouac.name} ${bivouac.wishlist ? 'des' : 'aux'} envies`} aria-pressed={bivouac.wishlist} onClick={() => onUpdate(bivouac.id, { wishlist: !bivouac.wishlist })}><Bookmark size={18} fill={bivouac.wishlist ? 'currentColor' : 'none'} /></button>
      {bivouac.visited && <span className="visited-badge"><Check size={12} /> Fait</span>}
    </div>
    <div className="card-content">
      <p className="card-region"><MapPin size={12} />{bivouac.sector || 'Secteur : aucune idée'}</p>
      <h3><a href={`#/bivouac/${encodeURIComponent(bivouac.id)}`} onClick={e => { e.preventDefault(); onOpen(bivouac.id) }}>{bivouac.name}</a></h3>
      <p className="card-description">{bivouac.highlight || bivouac.description || 'Pas de description : on devait être à l’apéro.'}</p>
      <div className="card-metrics"><span title="Montée indicative, à rythme normal. Avec nos sacs, comptez plus."><Clock3 size={14} />{formatHours(profile?.ascentHours ?? null)}</span><span title="Dénivelé positif indicatif"><MoveUpRight size={14} />{profile?.elevationGainM == null ? 'D+ : aucune idée' : formatNumber(profile.elevationGainM, ' m D+')}</span></div>
      <div className="card-footer"><span className="season-caption">{profile?.season ? `Accès ${profile.season.toLocaleLowerCase('fr')}` : 'Saison : aucune idée'}</span><Button variant="ghost" size="sm" onClick={() => onOpen(bivouac.id)}>Jeter un œil <ArrowUpRight size={15} /></Button></div>
    </div>
  </article>
}
export function BivouacTable({ bivouacs, season, onOpen, onUpdate }: {
  bivouacs: Bivouac[]; season: Season | 'all'; onOpen: (id: string) => void; onUpdate: (id: string, changes: BivouacChanges) => boolean
}) {
  return <div className="table-scroll"><table className="bivouac-table"><thead><tr><th>Bivouac</th><th>Altitude</th><th>Montée</th><th>Dénivelé</th><th>Saison</th><th>Mon carnet</th></tr></thead><tbody>
    {bivouacs.map(item => { const p = getSeasonProfile(item, season); return <tr key={item.id}>
      <td><button className="table-name" onClick={() => onOpen(item.id)}><span className="table-icon"><Tent size={19} /></span><span><strong>{item.name}</strong><small>{item.sector || 'Secteur : aucune idée'}</small></span></button></td>
      <td>{formatNumber(item.altitudeM, ' m')}</td><td>{formatHours(p?.ascentHours ?? null)}</td><td>{formatNumber(p?.elevationGainM ?? null, ' m')}</td><td><span className="tag">{p?.season ?? '—'}</span></td>
      <td><div className="inline-actions"><Button variant="ghost" size="icon" aria-label={`Envie : ${item.name}`} aria-pressed={item.wishlist} onClick={() => onUpdate(item.id, { wishlist: !item.wishlist })}><Bookmark size={17} fill={item.wishlist ? 'currentColor' : 'none'} /></Button><Button variant={item.visited ? 'secondary' : 'ghost'} size="icon" aria-label={`Visité : ${item.name}`} aria-pressed={item.visited} onClick={() => onUpdate(item.id, { visited: !item.visited })}><Check size={17} /></Button></div></td>
    </tr> })}
  </tbody></table></div>
}
