import Papa from 'papaparse'
import { SEASONS, type Bivouac, type BivouacChanges, type Coordinates, type Season, type SeasonalProfile, type SourceRecord } from '../types/bivouac'

const EXPORT_VERSION = '1'
const RESERVED = ['__bivacco_version', '__bivacco_id', '__bivacco_edits', '__bivacco_raw'] as const
const MAX_ROWS = 10_000
const MAX_LENGTH = 20_000_000
const numberFormat = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/

export interface CsvImportResult {
  bivouacs: Bivouac[]
  warnings: string[]
  rowCount: number
  isBackup: boolean
}

export function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value.trim())
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

export function isValidCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== 'object') return false
  const coordinates = value as Partial<Coordinates>
  return typeof coordinates.lat === 'number' && typeof coordinates.lng === 'number' &&
    Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng) &&
    coordinates.lat >= -90 && coordinates.lat <= 90 && coordinates.lng >= -180 && coordinates.lng <= 180
}

const normalize = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr')
const nonEmpty = (value: string | undefined) => value?.trim() || null
// CRLF/LF variants of a note describe the same profile; raw source text stays untouched.
const profileKey = (value: SeasonalProfile) => JSON.stringify(value, (_key, item: unknown) =>
  typeof item === 'string' ? item.replace(/\r\n/g, '\n') : item)

function valueOf(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) if (row[key]?.trim()) return row[key].trim()
  return ''
}

function numeric(value: string | undefined): number | null {
  if (!value?.trim() || !numberFormat.test(value.trim())) return null
  const result = Number(value.trim().replace(',', '.'))
  return Number.isFinite(result) ? result : null
}

function stableId(name: string, sector: string): string {
  const identity = `${normalize(name)}|${normalize(sector)}`
  let hash = 2166136261
  for (let i = 0; i < identity.length; i++) hash = Math.imul(hash ^ identity.charCodeAt(i), 16777619)
  const slug = normalize(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180)
  return `${slug || 'bivouac'}-${(hash >>> 0).toString(36)}`
}

function link(row: Record<string, string>, header: string): string | null {
  return safeUrl(row[`${header} [URL]`]) ?? safeUrl(row[header])
}

function imageLink(row: Record<string, string>): string | null {
  const candidate = link(row, 'Photo') ?? safeUrl(valueOf(row, 'Image URL', 'imageUrl'))
  if (!candidate) return null
  // Search links are useful references, never photographs of the bivouac.
  if (row['Photo [formule]']?.includes('IMAGE(')) return candidate
  if (/\.(?:jpe?g|png|webp|avif|gif)(?:[?#]|$)/i.test(candidate)) return candidate
  return null
}

function mapCoordinates(url: string | null): Coordinates | null {
  if (!url) return null
  const parsed = new URL(url)
  // A named Google place ID or an @ camera center is not a geographic point.
  if (!/(^|\.)google\.[a-z.]+$/.test(parsed.hostname)) return null
  let pathQuery = ''
  if (parsed.pathname.startsWith('/maps/search/')) {
    try { pathQuery = decodeURIComponent(parsed.pathname.slice('/maps/search/'.length)) }
    catch { return null }
  }
  const query = parsed.searchParams.get('query') ?? parsed.searchParams.get('q') ?? pathQuery
  const match = query.match(/^\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*$/)
  if (!match) return null
  const result = { lat: Number(match[1]), lng: Number(match[2]) }
  return isValidCoordinates(result) ? result : null
}

function coordinates(row: Record<string, string>, rowNumber: number): Coordinates | null {
  const latRaw = valueOf(row, 'Latitude', 'latitude', 'lat')
  const lngRaw = valueOf(row, 'Longitude', 'longitude', 'lng', 'lon')
  if (!latRaw && !lngRaw) return mapCoordinates(link(row, 'Google Maps'))
  const result = { lat: numeric(latRaw), lng: numeric(lngRaw) }
  if (!isValidCoordinates(result)) throw new Error(`Ligne ${rowNumber} : latitude et longitude doivent former une paire valide (−90 à 90, −180 à 180).`)
  return result
}

function profile(row: Record<string, string>, warnings: Set<string>): SeasonalProfile {
  const seasonValue = valueOf(row, 'Feuille', 'Saison', 'season')
  const season = SEASONS.find((item) => normalize(item) === normalize(seasonValue)) ?? null
  if (seasonValue && !season) warnings.add(`Saison « ${seasonValue} » inconnue au bataillon : conservée telle quelle dans les données originales.`)
  const score = (header: string) => {
    const result = numeric(row[header])
    if (row[header]?.trim() && (result === null || result < 0 || result > 5)) {
      warnings.add(`Valeur « ${header} » hors de l'échelle 0–5 : conservée dans les données originales.`)
      return null
    }
    return result
  }
  const amount = (header: string) => {
    const result = numeric(row[header])
    if (row[header]?.trim() && (result === null || result < 0)) {
      warnings.add(`Valeur « ${header} » non numérique ou négative : conservée dans les données originales.`)
      return null
    }
    return result
  }
  return {
    season,
    sourceStatus: valueOf(row, 'État', 'Etat'),
    summerDeparture: nonEmpty(row['Départ été']),
    summerDepartureAltitudeM: amount('Altitude départ été (m)'),
    winterDeparture: nonEmpty(row['Départ hiver']),
    winterDepartureAltitudeM: amount('Altitude départ hiver (m)'),
    drivingTime: nonEmpty(row['Trajet voiture']),
    ascentHours: amount('Montée (h) ≈'),
    elevationGainM: amount('D+ (m) ≈'),
    seasonRating: score('Classement saison /5'),
    isolationRating: score('Isolement /5'),
    solitudeRating: score("Probabilité d'être seul /5"),
    atmosphereRating: score('Ambiance /5'),
    viewRating: score('Vue /5'),
    globalRating: score('Rating global /5'),
    preciseScore: score('Score global précis'),
    winterRisk: score('Risque hiver'),
    skiDifficulty: nonEmpty(row['Difficulté ski (FR)']),
    reliability: nonEmpty(row['Fiabilité des données']),
    originalNotes: nonEmpty(row['Notes originales']),
  }
}

/** Derive profiles in source order after a dataset update, retaining distinct imported approaches. */
export function profilesFromRecords(records: readonly SourceRecord[]): SeasonalProfile[] {
  const profiles = new Map<string, SeasonalProfile>()
  for (const record of records) {
    const item = profile(record.values, new Set())
    if (!profiles.has(profileKey(item))) profiles.set(profileKey(item), item)
  }
  return [...profiles.values()]
}

function parseJson(value: string, field: string, rowNumber: number): unknown {
  try { return JSON.parse(value) as unknown } catch { throw new Error(`Ligne ${rowNumber} : ${field} JSON invalide.`) }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function sourceRecord(row: Record<string, string>, sourceName: string, rowNumber: number): SourceRecord {
  if (row.__bivacco_raw) {
    const raw = parseJson(row.__bivacco_raw, 'source', rowNumber)
    if (!isObject(raw) || typeof raw.source !== 'string' || typeof raw.sheet !== 'string' ||
      typeof raw.row !== 'number' || !Number.isSafeInteger(raw.row) || raw.row < 1 || !isObject(raw.values) ||
      !Object.values(raw.values).every((value) => typeof value === 'string')) {
      throw new Error(`Ligne ${rowNumber} : données source invalides.`)
    }
    return raw as unknown as SourceRecord
  }
  const values = Object.fromEntries(Object.entries(row).filter(([key]) => !RESERVED.includes(key as (typeof RESERVED)[number])))
  const sourceRow = numeric(row.Ligne) ?? rowNumber
  if (!Number.isSafeInteger(sourceRow) || sourceRow < 1) throw new Error(`Ligne ${rowNumber} : numéro de ligne source invalide.`)
  return {
    source: valueOf(row, 'Source') || sourceName,
    sheet: valueOf(row, 'Feuille', 'Saison'),
    row: sourceRow,
    values,
  }
}

function parseChanges(value: string, rowNumber: number): BivouacChanges {
  const data = parseJson(value, 'modifications', rowNumber)
  if (!isObject(data)) throw new Error(`Ligne ${rowNumber} : modifications invalides.`)
  const fields = ['name', 'sector', 'description', 'highlight', 'personalNotes', 'wishlist', 'visited', 'altitudeM', 'coordinates']
  if (fields.some((key) => !(key in data)) || Object.keys(data).some((key) => !fields.includes(key))) {
    throw new Error(`Ligne ${rowNumber} : modifications de sauvegarde incomplètes ou non prises en charge.`)
  }
  const result: BivouacChanges = {}
  for (const key of ['name', 'sector', 'description', 'highlight', 'personalNotes'] as const) {
    if (key in data) {
      if (typeof data[key] !== 'string' || (key === 'name' && !data[key].trim())) throw new Error(`Ligne ${rowNumber} : champ « ${key} » invalide.`)
      result[key] = data[key]
    }
  }
  for (const key of ['wishlist', 'visited'] as const) {
    if (key in data) {
      if (typeof data[key] !== 'boolean') throw new Error(`Ligne ${rowNumber} : champ « ${key} » invalide.`)
      result[key] = data[key]
    }
  }
  if ('altitudeM' in data) {
    if (data.altitudeM !== null && (typeof data.altitudeM !== 'number' || !Number.isFinite(data.altitudeM) || data.altitudeM < -500 || data.altitudeM > 9000)) {
      throw new Error(`Ligne ${rowNumber} : altitude invalide.`)
    }
    result.altitudeM = data.altitudeM
  }
  if ('coordinates' in data) {
    if (data.coordinates !== null && !isValidCoordinates(data.coordinates)) throw new Error(`Ligne ${rowNumber} : coordonnées invalides.`)
    result.coordinates = data.coordinates
  }
  return result
}

/** Parse atomically: malformed CSV or invalid identities/coordinates never partially import. */
export function parseBivouacsCsv(text: string, sourceName = 'Import CSV'): CsvImportResult {
  if (text.length > MAX_LENGTH) throw new Error('Le fichier CSV dépasse la limite de 20 Mo.')
  if (!text.trim()) throw new Error('Le fichier CSV est vide. Comme la gourde au bout de deux heures.')
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
    dynamicTyping: false,
  })
  // Papa cannot infer a delimiter on a valid one-column file; names alone are supported.
  const errors = parsed.errors.filter((error) => error.code !== 'UndetectableDelimiter')
  if (errors.length) {
    const reasons: Record<string, string> = {
      TooManyFields: 'la ligne contient plus de champs que l’en-tête',
      TooFewFields: 'la ligne contient moins de champs que l’en-tête',
      MissingQuotes: 'un champ entre guillemets n’est pas fermé',
      InvalidQuotes: 'les guillemets d’un champ sont mal formés',
    }
    throw new Error(`CSV invalide : ${reasons[errors[0].code] ?? 'la structure du fichier est incorrecte'} (ligne ${(errors[0].row ?? 0) + 2}).`)
  }
  if (parsed.meta.renamedHeaders && Object.keys(parsed.meta.renamedHeaders).length) throw new Error('Le CSV contient plusieurs colonnes portant le même nom. Une seule par nom, sinon on s’emmêle les crampons.')
  const headers = parsed.meta.fields ?? []
  if (!['Cabane / lieu', 'Nom', 'name'].some((header) => headers.includes(header))) throw new Error('Colonne obligatoire manquante : « Cabane / lieu » (ou « Nom »). Sans elle, on ne sait pas de quoi on parle.')
  if (!parsed.data.length) throw new Error('Le CSV ne contient aucun bivouac. Juste des en-têtes et beaucoup d’espoir.')
  if (parsed.data.length > MAX_ROWS) throw new Error(`Le CSV dépasse la limite de ${MAX_ROWS.toLocaleString('fr')} lignes.`)
  const warnings = new Set<string>()
  const places = new Map<string, Bivouac>()
  const identities = new Map<string, string>()
  const modifications = new Map<string, string>()
  parsed.data.forEach((csvRow, index) => {
    const rowNumber = index + 2
    if (csvRow.__bivacco_version && csvRow.__bivacco_version !== EXPORT_VERSION) throw new Error(`Version d’export ${csvRow.__bivacco_version} non prise en charge (elle vient du futur ?). Aucune donnée n’a été importée.`)
    if (RESERVED.some((key) => headers.includes(key)) && RESERVED.some((key) => !csvRow[key]?.trim())) {
      throw new Error(`Ligne ${rowNumber} : colonnes de sauvegarde incomplètes. Les quatre colonnes __bivacco_* sont nécessaires.`)
    }
    const raw = sourceRecord(csvRow, sourceName, rowNumber)
    const row = raw.values
    const name = valueOf(row, 'Cabane / lieu', 'Nom', 'name')
    const sector = valueOf(row, 'Secteur', 'sector')
    if (!name) throw new Error(`Ligne ${rowNumber} : le nom du bivouac est obligatoire.`)
    const identity = `${normalize(name)}|${normalize(sector)}`
    const id = csvRow.__bivacco_id?.trim() || stableId(name, sector)
    if (!/^[\p{L}\p{N}_-]{1,250}$/u.test(id)) throw new Error(`Ligne ${rowNumber} : identifiant invalide.`)
    if (!csvRow.__bivacco_version && identities.has(id) && identities.get(id) !== identity) throw new Error(`Ligne ${rowNumber} : le même identifiant désigne deux lieux différents.`)
    identities.set(id, identity)
    const altitudeRaw = valueOf(row, 'Alt. cabane (m)', 'Altitude', 'altitudeM')
    const altitudeM = numeric(altitudeRaw)
    if (altitudeRaw && (altitudeM === null || altitudeM < -500 || altitudeM > 9000)) throw new Error(`Ligne ${rowNumber} : altitude invalide « ${altitudeRaw} ».`)
    const seasonal = profile(row, warnings)
    const point = coordinates(row, rowNumber)
    const existing = places.get(id)
    if (existing) {
      if (existing.altitudeM !== altitudeM && altitudeM !== null) warnings.add(`« ${name} » : altitudes différentes selon les sources ; toutes les valeurs originales sont conservées.`)
      if (existing.coordinates && point && (existing.coordinates.lat !== point.lat || existing.coordinates.lng !== point.lng)) warnings.add(`« ${name} » : coordonnées différentes selon les sources ; premier point conservé.`)
      existing.altitudeM ??= altitudeM
      existing.visited ||= ['fait', 'visite'].includes(normalize(seasonal.sourceStatus))
      existing.coordinates ??= point
      existing.imageUrl ??= imageLink(row)
      for (const [field, header] of Object.entries({ official: 'Fiche officielle', maps: 'Google Maps', gallery: 'Photos / galerie', accessSource: 'Source altitude / accès', skiSource: 'Source cotation C2C' })) {
        existing.links[field as keyof Bivouac['links']] ??= link(row, header)
      }
      if (!existing.description) existing.description = valueOf(row, 'Description')
      if (!existing.highlight) existing.highlight = valueOf(row, 'Coup de cœur')
      if (!existing.seasons.some((item) => profileKey(item) === profileKey(seasonal))) existing.seasons.push(seasonal)
      existing.rawRecords.push(raw)
    } else {
      places.set(id, {
        id, name, sector, altitudeM,
        description: valueOf(row, 'Description'),
        highlight: valueOf(row, 'Coup de cœur'),
        imageUrl: imageLink(row),
        coordinates: point,
        links: {
          official: link(row, 'Fiche officielle'),
          maps: link(row, 'Google Maps'),
          gallery: link(row, 'Photos / galerie'),
          accessSource: link(row, 'Source altitude / accès'),
          skiSource: link(row, 'Source cotation C2C'),
        },
        seasons: [seasonal], rawRecords: [raw],
        wishlist: false,
        visited: ['fait', 'visite', 'visité'].includes(normalize(seasonal.sourceStatus)),
        personalNotes: '',
      })
    }
    if (csvRow.__bivacco_edits) {
      const changes = parseChanges(csvRow.__bivacco_edits, rowNumber)
      const serialized = JSON.stringify(changes)
      if (modifications.has(id) && modifications.get(id) !== serialized) throw new Error(`Ligne ${rowNumber} : modifications contradictoires pour « ${name} ».`)
      modifications.set(id, serialized)
    }
  })
  const bivouacs = [...places.values()]
  for (const bivouac of bivouacs) {
    const changes = modifications.get(bivouac.id)
    if (changes) Object.assign(bivouac, JSON.parse(changes) as BivouacChanges)
  }
  return { bivouacs, warnings: [...warnings], rowCount: parsed.data.length, isBackup: parsed.data.every((row) => row.__bivacco_version === EXPORT_VERSION && !!row.__bivacco_edits) }
}

function changesFor(bivouac: Bivouac): BivouacChanges {
  const { name, sector, altitudeM, description, highlight, coordinates, wishlist, visited, personalNotes } = bivouac
  return { name, sector, altitudeM, description, highlight, coordinates, wishlist, visited, personalNotes }
}

/** Raw JSON makes spreadsheet-formula escaping lossless on reimport, including unknown columns. */
export function exportBivouacsCsv(bivouacs: readonly Bivouac[]): string {
  const records = bivouacs.flatMap((bivouac) => {
    const originalRecords = bivouac.rawRecords.length ? bivouac.rawRecords : [{
      source: 'Saisie locale', sheet: '', row: 2,
      values: { 'Cabane / lieu': bivouac.name, Secteur: bivouac.sector },
    } satisfies SourceRecord]
    return originalRecords.map((raw) => ({
      ...raw.values,
      'Cabane / lieu': bivouac.name,
      Secteur: bivouac.sector,
      'Alt. cabane (m)': bivouac.altitudeM?.toString() ?? '',
      Description: bivouac.description,
      'Coup de cœur': bivouac.highlight,
      Latitude: bivouac.coordinates?.lat.toString() ?? '',
      Longitude: bivouac.coordinates?.lng.toString() ?? '',
      'Ma sélection': bivouac.wishlist ? 'Oui' : 'Non',
      Visité: bivouac.visited ? 'Oui' : 'Non',
      'Notes personnelles': bivouac.personalNotes,
      __bivacco_version: EXPORT_VERSION,
      __bivacco_id: bivouac.id,
      __bivacco_edits: JSON.stringify(changesFor(bivouac)),
      __bivacco_raw: JSON.stringify(raw),
    }))
  })
  const fields = [...new Set(records.flatMap((row) => Object.keys(row)))].filter((field) => !RESERVED.includes(field as (typeof RESERVED)[number]))
  return '\uFEFF' + Papa.unparse({ fields: [...fields, ...RESERVED], data: records }, { newline: '\r\n', escapeFormulae: true })
}

export function getSeasonProfile(bivouac: Bivouac, season?: Season | 'all'): SeasonalProfile | undefined {
  if (season && season !== 'all') return bivouac.seasons.find((profile) => profile.season === season)
  return bivouac.seasons.find((profile) => profile.season === 'Été') ?? bivouac.seasons[0]
}

/** Nonempty source metadata wins; backups can explicitly clear editable values. */
export function mergeBivouacs(existing: readonly Bivouac[], incoming: readonly Bivouac[], options: { restorePersonalState?: boolean } = {}): Bivouac[] {
  const merged = new Map(existing.map((bivouac) => [bivouac.id, bivouac]))
  for (const item of incoming) {
    const current = merged.get(item.id) ?? [...merged.values()].find((candidate) => normalize(candidate.name) === normalize(item.name) && normalize(candidate.sector) === normalize(item.sector))
    if (!current) { merged.set(item.id, item); continue }
    const unique = <T,>(items: T[], key: (value: T) => string = JSON.stringify): T[] => {
      const values = new Map<string, T>()
      for (const value of items) if (!values.has(key(value))) values.set(key(value), value)
      return [...values.values()]
    }
    merged.set(current.id, {
      ...current,
      ...item,
      id: current.id,
      imageUrl: item.imageUrl ?? current.imageUrl,
      links: {
        official: item.links.official ?? current.links.official,
        maps: item.links.maps ?? current.links.maps,
        gallery: item.links.gallery ?? current.links.gallery,
        accessSource: item.links.accessSource ?? current.links.accessSource,
        skiSource: item.links.skiSource ?? current.links.skiSource,
      },
      ...(!options.restorePersonalState ? {
        altitudeM: item.altitudeM ?? current.altitudeM,
        description: item.description || current.description,
        highlight: item.highlight || current.highlight,
        wishlist: current.wishlist,
        visited: current.visited,
        personalNotes: current.personalNotes,
        coordinates: item.coordinates ?? current.coordinates,
      } : {}),
      rawRecords: unique([...item.rawRecords, ...current.rawRecords]),
      seasons: unique([...item.seasons, ...current.seasons], profileKey),
    })
  }
  return [...merged.values()]
}
