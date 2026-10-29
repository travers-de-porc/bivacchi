import type { Bivouac, Season } from '@/types/bivouac'
import { getSeasonProfile } from './csv'
export interface FiltersState { search: string; season: Season | 'all'; sector: string; altitude: string; ascent: string; isolation: string; ski: string; located: boolean; status: 'all' | 'wishlist' | 'visited'; sort: string }
export const DEFAULT_FILTERS: FiltersState = { search: '', season: 'all', sector: '', altitude: '', ascent: '', isolation: '', ski: '', located: false, status: 'all', sort: 'name' }
export const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr')
export function filterBivouacs(bivouacs: Bivouac[], filters: FiltersState) {
  const query = normalize(filters.search.trim())
  const filtered = bivouacs.filter(item => {
    const profiles = filters.season === 'all' ? item.seasons : item.seasons.filter(profile => profile.season === filters.season)
    if (filters.season !== 'all' && !profiles.length) return false
    if (query && !normalize([item.name, item.sector, item.description, item.highlight, item.personalNotes, ...item.seasons.map(p => p.originalNotes)].join(' ')).includes(query)) return false
    if (filters.sector && !item.sector.startsWith(filters.sector)) return false
    if (filters.status === 'wishlist' && !item.wishlist || filters.status === 'visited' && !item.visited) return false
    if (filters.located && !item.coordinates) return false
    if (filters.altitude) {
      if (item.altitudeM === null) return false
      const [min, max] = filters.altitude.split('-').map(Number)
      if (item.altitudeM < min || item.altitudeM >= max) return false
    }
    if (filters.ascent || filters.isolation || filters.ski) {
      if (!profiles.some(p => (!filters.ascent || p.ascentHours !== null && p.ascentHours <= Number(filters.ascent))
        && (!filters.isolation || p.isolationRating !== null && p.isolationRating >= Number(filters.isolation))
        && (!filters.ski || p.skiDifficulty === filters.ski))) return false
    }
    return true
  })
  return filtered.sort((a, b) => {
    if (filters.sort === 'altitude-asc') return (a.altitudeM ?? Infinity) - (b.altitudeM ?? Infinity)
    if (filters.sort === 'altitude-desc') return (b.altitudeM ?? -Infinity) - (a.altitudeM ?? -Infinity)
    if (filters.sort === 'ascent') return (getSeasonProfile(a, filters.season)?.ascentHours ?? Infinity) - (getSeasonProfile(b, filters.season)?.ascentHours ?? Infinity)
    if (filters.sort === 'score') return (getSeasonProfile(b, filters.season)?.preciseScore ?? -Infinity) - (getSeasonProfile(a, filters.season)?.preciseScore ?? -Infinity)
    return a.name.localeCompare(b.name, 'fr')
  })
}
