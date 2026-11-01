import type { Bivouac } from '../types/bivouac'
import { completes, isComplement, parseBivouacsCsv, profilesFromRecords } from './csv'

/**
 * Attach dated, sourced complements to the bundled dataset. Each complement row names the
 * source row it completes; supplied rows are never rewritten and remain visible as evidence.
 */
export function applyComplements(bivouacs: readonly Bivouac[], csv: string, sourceName = 'Bivacco_Explorer_complements.csv'): Bivouac[] {
  const complements = new Map(parseBivouacsCsv(csv, sourceName).bivouacs.map((item) => [item.id, item]))
  for (const [id, complement] of complements) {
    const place = bivouacs.find((item) => item.id === id)
    if (!place) throw new Error(`Compléments : « ${complement.name} » ne correspond à aucun bivouac du jeu initial.`)
    for (const record of complement.rawRecords) {
      if (!isComplement(record) || !place.rawRecords.some((source) => completes(record, source))) {
        throw new Error(`Compléments, ligne ${record.row} : la ligne source à compléter est introuvable pour « ${place.name} ».`)
      }
    }
  }
  return bivouacs.map((place) => {
    const complement = complements.get(place.id)
    if (!complement) return place
    const rawRecords = [...place.rawRecords, ...complement.rawRecords]
    return {
      ...place,
      description: complement.description || place.description,
      highlight: complement.highlight || place.highlight,
      rawRecords,
      seasons: profilesFromRecords(rawRecords),
    }
  })
}
