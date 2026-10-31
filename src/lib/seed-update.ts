import type { Bivouac } from '../types/bivouac'
import { mergeBivouacs, profilesFromRecords } from './csv'

const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right)

/** Three-way update: only replace values still equal to the previous bundled dataset. */
export function updateSeed(saved: readonly Bivouac[], previousSeed: readonly Bivouac[], nextSeed: readonly Bivouac[]): Bivouac[] {
  const previousById = new Map(previousSeed.map(item => [item.id, item]))
  const nextById = new Map(nextSeed.map(item => [item.id, item]))
  const result = saved.map(current => {
    const previous = previousById.get(current.id)
    const next = nextById.get(current.id)
    if (!previous || !next) return current

    const updated = mergeBivouacs([current], [next])[0]
    for (const field of ['name', 'sector', 'altitudeM', 'description', 'highlight', 'coordinates', 'imageUrl'] as const) {
      if (!same(current[field], previous[field])) Object.assign(updated, { [field]: current[field] })
    }
    for (const field of Object.keys(current.links) as (keyof Bivouac['links'])[]) {
      if (!same(current.links[field], previous.links[field])) updated.links[field] = current.links[field]
    }

    // Keep imported sources ahead of the new seed so their images/links survive CSV reloads.
    // Every historic source row remains intact, even when its displayed metadata is refreshed.
    const previousRecords = new Set(previous.rawRecords.map(record => JSON.stringify(record)))
    const customRecords = current.rawRecords.filter(record => !previousRecords.has(JSON.stringify(record)))
    updated.rawRecords = [...new Map([...customRecords, ...next.rawRecords, ...current.rawRecords]
      .map(record => [JSON.stringify(record), record])).values()]
    updated.seasons = profilesFromRecords(updated.rawRecords)
    return updated
  })
  const savedIds = new Set(saved.map(item => item.id))
  return [...result, ...nextSeed.filter(item => !savedIds.has(item.id))]
}
