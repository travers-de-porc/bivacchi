import { ArrowUpRight, Check, Compass, Leaf, MapPin, SlidersHorizontal, Snowflake, Sun, Flower2 } from 'lucide-react'
import type { Bivouac } from '@/types/bivouac'
import { SEASONS } from '@/types/bivouac'
import { DEFAULT_FILTERS, type FiltersState } from '@/lib/filters'
import { Button } from './ui/button'
const seasonIcons = { 'Été': Sun, 'Automne': Leaf, 'Hiver': Snowflake, 'Printemps': Flower2 }
export function Filters({ filters, onChange, bivouacs }: { filters: FiltersState; onChange: (filters: FiltersState) => void; bivouacs: Bivouac[] }) {
  const update = (changes: Partial<FiltersState>) => onChange({ ...filters, ...changes })
  const regions = [...new Set(bivouacs.map(b => b.sector.split(' · ')[0]).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'fr'))
  const ski = [...new Set(bivouacs.flatMap(b => b.seasons.map(p => p.skiDifficulty)).filter((x): x is string => !!x))].sort()
  return <div className="filters-content"><div className="filters-heading"><h2><SlidersHorizontal size={16} /> Affiner l’échappée</h2><button className="text-button" onClick={() => onChange({ ...DEFAULT_FILTERS, search: filters.search, status: filters.status })}>Effacer</button></div>
    <fieldset className="filter-group"><legend>À quelle saison ?</legend><div className="season-grid"><button className={`season-choice all-seasons ${filters.season === 'all' ? 'selected' : ''}`} onClick={() => update({ season: 'all' })} aria-pressed={filters.season === 'all'}><Compass size={15} />Toutes les saisons{filters.season === 'all' && <Check size={13} />}</button>{SEASONS.map(season => { const Icon = seasonIcons[season]; return <button key={season} className={`season-choice ${filters.season === season ? 'selected' : ''}`} aria-pressed={filters.season === season} onClick={() => update({ season })}><Icon size={15} />{season}</button> })}</div><p className="filter-help">Les accès et scores suivent la saison du carnet.</p></fieldset>
    <label className="filter-group"><span>Le terrain de jeu</span><select value={filters.sector} onChange={e => update({ sector: e.target.value })}><option value="">Tous les secteurs</option>{regions.map(r => <option key={r}>{r}</option>)}</select></label>
    <label className="filter-group"><span>Altitude du bivouac</span><select value={filters.altitude} onChange={e => update({ altitude: e.target.value })}><option value="">Toutes les altitudes</option><option value="0-2000">Moins de 2 000 m</option><option value="2000-2500">2 000 à 2 499 m</option><option value="2500-3000">2 500 à 2 999 m</option><option value="3000-10000">3 000 m et plus</option></select></label>
    <label className="filter-group"><span>Temps de montée maximum</span><select value={filters.ascent} onChange={e => update({ ascent: e.target.value })}><option value="">Prendre le temps</option><option value="2">2 heures</option><option value="4">4 heures</option><option value="6">6 heures</option></select></label>
    <label className="filter-group"><span>Envie de solitude</span><select value={filters.isolation} onChange={e => update({ isolation: e.target.value })}><option value="">Tous les niveaux d’isolement</option><option value="3">Isolement ≥ 3 / 5</option><option value="4">Isolement ≥ 4 / 5</option><option value="5">Isolement 5 / 5</option></select></label>
    <label className="filter-group"><span>Cotation ski du carnet</span><select value={filters.ski} onChange={e => update({ ski: e.target.value })}><option value="">Toutes les cotations</option>{ski.map(s => <option key={s}>{s}</option>)}</select></label>
    <label className="checkbox-field"><input type="checkbox" checked={filters.located} onChange={e => update({ located: e.target.checked })} /><MapPin size={15} /><span>Avec coordonnées GPS</span></label>
    <div className="field-note"><span className="note-icon"><Compass size={23} strokeWidth={1.4} /></span><h3>Le début d’une belle aventure.</h3><p>Un lieu vous inspire ? Ajoutez-le à vos envies pour le retrouver ici.</p><Button variant="ghost" size="sm" onClick={() => update({ status: 'wishlist' })}>Mes envies <ArrowUpRight size={14} /></Button></div>
  </div>
}
