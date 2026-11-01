export const SEASONS = ['Été', 'Automne', 'Hiver', 'Printemps'] as const
export type Season = (typeof SEASONS)[number]

export interface Coordinates {
  lat: number
  lng: number
}

/** A source row is immutable evidence, including every column not mapped by this version. */
export interface SourceRecord {
  source: string
  sheet: string
  row: number
  values: Record<string, string>
}

export interface SeasonalProfile {
  season: Season | null
  sourceStatus: string
  summerDeparture: string | null
  summerDepartureAltitudeM: number | null
  winterDeparture: string | null
  winterDepartureAltitudeM: number | null
  drivingTime: string | null
  ascentHours: number | null
  elevationGainM: number | null
  seasonRating: number | null
  isolationRating: number | null
  solitudeRating: number | null
  atmosphereRating: number | null
  viewRating: number | null
  globalRating: number | null
  preciseScore: number | null
  winterRisk: number | null
  skiDifficulty: string | null
  reliability: string | null
  originalNotes: string | null
  /** Route text from a sourced complement; the backlog itself has no route column. */
  route: string | null
  /** URL and ISO date of the complement that filled values of this source row. */
  complementSource: string | null
  complementDate: string | null
}

export interface BivouacLinks {
  official: string | null
  maps: string | null
  gallery: string | null
  accessSource: string | null
  skiSource: string | null
}

export interface Bivouac {
  id: string
  name: string
  sector: string
  altitudeM: number | null
  description: string
  highlight: string
  imageUrl: string | null
  coordinates: Coordinates | null
  links: BivouacLinks
  seasons: SeasonalProfile[]
  rawRecords: SourceRecord[]
  wishlist: boolean
  visited: boolean
  personalNotes: string
}

/** Only editable personal metadata; source rows always remain available. */
export type BivouacChanges = Partial<Pick<Bivouac,
  'name' | 'sector' | 'altitudeM' | 'description' | 'highlight' | 'coordinates' |
  'wishlist' | 'visited' | 'personalNotes'
>>

/** Future ingestion contract. Seasonal planning data above is never a trip report. */
export interface TripReport {
  id: string
  bivouacId: string
  occurredOn: string | null
  recordedAt: string
  sourceUrl: string | null
  sourceAuthor: string | null
  text: string
  observations: {
    snow: string | null
    access: string | null
    occupancy: string | null
    conditions: string | null
  }
}
