import Papa from 'papaparse'
import type { Bivouac, Coordinates, SourceRecord } from '../types/bivouac'
import { isValidCoordinates, safeUrl } from './csv'

const CONTROL_DATA = 'Sources et contrôles [données]'
const CONTROL_SOURCE = 'Sources et contrôles [source]'
const CONTROL_ROW = 'Sources et contrôles [ligne]'
const identity = (name: string, sector: string) => [name, sector]
  .map((value) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr'))
  .join('|')

function sourceCoordinates(values: Record<string, string>): Coordinates | null {
  const latitude = values.Latitude?.trim()
  const longitude = values.Longitude?.trim()
  const decimal = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/
  if (!latitude || !longitude || !decimal.test(latitude) || !decimal.test(longitude)) return null
  const point = { lat: Number(latitude.replace(',', '.')), lng: Number(longitude.replace(',', '.')) }
  return isValidCoordinates(point) ? point : null
}

/** Attach evidence without manufacturing another seasonal access record. */
export function attachSourceControls(
  bivouacs: readonly Bivouac[],
  csv: string,
  sourceName = 'Bivacco_Explorer_sources_et_controles.csv',
): Bivouac[] {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: 'greedy', dynamicTyping: false })
  const fields = parsed.meta.fields ?? []
  if (parsed.errors.length || Object.keys(parsed.meta.renamedHeaders ?? {}).length ||
    !['Cabane / lieu', 'Secteur', 'Latitude', 'Longitude'].every((field) => fields.includes(field))) {
    throw new Error('Le fichier de sources et contrôles est invalide ou incomplet.')
  }
  const places = new Map(bivouacs.map((place) => [identity(place.name, place.sector), place]))
  if (places.size !== bivouacs.length) throw new Error('Plusieurs bivouacs correspondent au même nom et secteur.')
  const controls = new Map<string, SourceRecord>()
  parsed.data.forEach((values, index) => {
    const key = identity(values['Cabane / lieu'], values.Secteur)
    const place = places.get(key)
    const point = sourceCoordinates(values)
    if (!place || controls.has(key)) throw new Error(`Contrôles, ligne ${index + 2} : lieu inconnu ou présent plusieurs fois.`)
    if (!point || !place.coordinates || point.lat !== place.coordinates.lat || point.lng !== place.coordinates.lng) {
      throw new Error(`Contrôles, ligne ${index + 2} : coordonnées invalides ou différentes du CSV enrichi.`)
    }
    if (values['Altitude (m)']?.trim() && Number(values['Altitude (m)'].replace(',', '.')) !== place.altitudeM) {
      throw new Error(`Contrôles, ligne ${index + 2} : altitude différente du CSV enrichi.`)
    }
    for (const field of ['GPS [source]', 'GPS [fiabilité]', 'Photo [source]', 'Photo [statut]']) {
      const expected = place.rawRecords.map((record) => record.values[field]).find((value) => value?.trim())
      if (field in values && (values[field]?.trim() ?? '') !== (expected?.trim() ?? '')) {
        throw new Error(`Contrôles, ligne ${index + 2} : « ${field} » diffère du CSV enrichi.`)
      }
    }
    // A blank control photograph means no direct image, even if the source contains a search link.
    if ('Photo [URL]' in values && safeUrl(values['Photo [URL]']) !== place.imageUrl) {
      throw new Error(`Contrôles, ligne ${index + 2} : photo différente du CSV enrichi.`)
    }
    controls.set(key, { source: sourceName, sheet: '', row: index + 2, values })
  })
  if (controls.size !== places.size) throw new Error('Le fichier de sources et contrôles ne couvre pas tous les bivouacs.')
  return bivouacs.map((place) => {
    const control = controls.get(identity(place.name, place.sector))!
    if (!place.rawRecords.length) throw new Error(`« ${place.name} » ne possède aucune ligne source à enrichir.`)
    return {
      ...place,
      rawRecords: place.rawRecords.map((record, index) => index ? record : {
        ...record,
        values: {
          ...record.values,
          [CONTROL_DATA]: JSON.stringify(control.values),
          [CONTROL_SOURCE]: control.source,
          [CONTROL_ROW]: String(control.row),
        },
      }),
    }
  })
}

function readControl(bivouac: Bivouac): SourceRecord | null {
  for (const { values } of bivouac.rawRecords) {
    if (!values[CONTROL_DATA]) continue
    try {
      const data: unknown = JSON.parse(values[CONTROL_DATA])
      const row = Number(values[CONTROL_ROW])
      if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.values(data).every((value) => typeof value === 'string') ||
        !values[CONTROL_SOURCE]?.trim() || !Number.isSafeInteger(row) || row < 1) continue
      return { source: values[CONTROL_SOURCE], sheet: '', row, values: data as Record<string, string> }
    } catch { /* Keep malformed metadata available in raw records; never execute it. */ }
  }
  return null
}

export interface Enrichment {
  gpsSource: string | null
  gpsReliability: string | null
  gpsMapsUrl: string | null
  photoSource: string | null
  photoStatus: string | null
  coordinates: Coordinates | null
  control: SourceRecord | null
}

/** Source coordinates stay distinct from coordinates subsequently corrected by the user. */
export function getEnrichment(bivouac: Bivouac): Enrichment {
  const control = readControl(bivouac)
  const records = [...bivouac.rawRecords.map((record) => record.values), ...(control ? [control.values] : [])]
  // Coordinates, reliability and source must describe the same evidence row. An
  // unrelated import can precede this evidence without inheriting its reliability.
  const gps = records.find((values) => (values['GPS [source]']?.trim() || values['GPS [fiabilité]']?.trim()) && sourceCoordinates(values))
  const photo = records.find((values) => (values['Photo [source]']?.trim() || values['Photo [statut]']?.trim()) &&
    (safeUrl(values['Photo [URL]']) ?? safeUrl(values.Photo)) === bivouac.imageUrl)
  return {
    gpsSource: gps?.['GPS [source]']?.trim() || null,
    gpsReliability: gps?.['GPS [fiabilité]']?.trim() || null,
    gpsMapsUrl: safeUrl(gps?.['Google Maps GPS [URL]']),
    photoSource: photo?.['Photo [source]']?.trim() || null,
    photoStatus: photo?.['Photo [statut]']?.trim() || null,
    coordinates: gps ? sourceCoordinates(gps) : null,
    control,
  }
}
