import { useEffect, useMemo, useState } from 'react'
import { divIcon, latLngBounds, type LatLngTuple } from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import { ArrowUpRight, LocateFixed, MapPin, Mountain, RefreshCw, WifiOff } from 'lucide-react'
import type { Bivouac, Coordinates } from '../types/bivouac'
import { isValidCoordinates } from '../lib/csv'
import { getEnrichment } from '../lib/enrichment'
import 'leaflet/dist/leaflet.css'
import './MapView.css'

interface MapViewProps {
  bivouacs: Bivouac[]
  onSelect: (id: string) => void
}

type LocatedBivouac = Bivouac & { coordinates: Coordinates }

const ALPS_CENTER: LatLngTuple = [45.9, 7.2]
const markerIcon = divIcon({
  className: 'bivouac-map-marker',
  html: '<span><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m3 20 7-15 4 8 3-5 5 12Z"/><path d="m7 11 3 2 2-2"/></svg></span>',
  iconSize: [38, 44],
  iconAnchor: [19, 42],
  popupAnchor: [0, -42],
})

function FrameMap({ positions }: { positions: LatLngTuple[] }) {
  const map = useMap()

  useEffect(() => {
    if (positions.length) {
      map.fitBounds(latLngBounds(positions), { padding: [55, 55], maxZoom: 12 })
    } else {
      map.setView(ALPS_CENTER, 7)
    }
  }, [map, positions])

  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])

  return (
    <button
      type="button"
      className="map-recenter"
      aria-label="Recentrer la carte sur les bivouacs"
      title="Recentrer la carte (encore perdus ?)"
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        if (positions.length) {
          map.fitBounds(latLngBounds(positions), { padding: [55, 55], maxZoom: 12 })
        } else {
          map.setView(ALPS_CENTER, 7)
        }
      }}
    >
      <LocateFixed size={19} aria-hidden="true" />
    </button>
  )
}

function GpsReliability({ bivouac }: { bivouac: LocatedBivouac }) {
  const enrichment = getEnrichment(bivouac)
  const changedCoordinates = enrichment.coordinates !== null && (bivouac.coordinates.lat !== enrichment.coordinates.lat || bivouac.coordinates.lng !== enrichment.coordinates.lng)
  if (changedCoordinates) return <p>Coordonnées modifiées par vos soins</p>
  return enrichment.gpsReliability ? <p>Fiabilité GPS déclarée : {enrichment.gpsReliability}</p> : null
}

export default function MapView({ bivouacs, onSelect }: MapViewProps) {
  const located = useMemo(() => bivouacs.filter((item): item is LocatedBivouac =>
    isValidCoordinates(item.coordinates)), [bivouacs])
  const positions = useMemo<LatLngTuple[]>(() => located.map((item) =>
    [item.coordinates.lat, item.coordinates.lng]), [located])
  const missing = bivouacs.length - located.length
  const firstMissing = bivouacs.find((item) => !isValidCoordinates(item.coordinates))
  const [online, setOnline] = useState(() => navigator.onLine)
  const [tileError, setTileError] = useState(false)
  const [tileAttempt, setTileAttempt] = useState(0)

  useEffect(() => {
    const updateConnection = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateConnection)
    window.addEventListener('offline', updateConnection)
    return () => {
      window.removeEventListener('online', updateConnection)
      window.removeEventListener('offline', updateConnection)
    }
  }, [])

  return (
    <section className="map-view" aria-label="Carte des bivouacs">
      <div className="map-view-caption">
        <span><MapPin size={16} aria-hidden="true" /><strong>{located.length}</strong> sur {bivouacs.length} bivouacs sur la carte</span>
        <span className="map-caption-detail">Seulement ceux qu’on sait vraiment placer</span>
      </div>
      <div className="map-canvas-wrap">
        <MapContainer
          center={ALPS_CENTER}
          zoom={7}
          zoomControl={false}
          scrollWheelZoom={false}
          className="bivouac-leaflet-map"
        >
          <TileLayer
            key={tileAttempt}
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            maxZoom={19}
            eventHandlers={{ tileerror: () => setTileError(true) }}
          />
          <ZoomControl position="topright" zoomInTitle="Zoomer" zoomOutTitle="Dézoomer" />
          <FrameMap positions={positions} />
          {located.map((bivouac) => (
            <Marker
              key={bivouac.id}
              position={[bivouac.coordinates.lat, bivouac.coordinates.lng]}
              icon={markerIcon}
              title={bivouac.name}
              alt={bivouac.name}
              keyboard
            >
              <Popup minWidth={210} maxWidth={280}>
                <div className="map-popup">
                  <span className="map-popup-sector">{bivouac.sector || 'Secteur : aucune idée'}</span>
                  <h3>{bivouac.name}</h3>
                  <p><Mountain size={15} aria-hidden="true" />{bivouac.altitudeM === null ? 'Altitude : aucune idée' : `${bivouac.altitudeM.toLocaleString('fr-FR')} m`}</p>
                  <GpsReliability bivouac={bivouac} />
                  <button type="button" onClick={() => onSelect(bivouac.id)}>Jeter un œil <ArrowUpRight size={16} aria-hidden="true" /></button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        {(!online || tileError) && (
          <div className="map-network-notice" role="status">
            <WifiOff size={17} aria-hidden="true" />
            <span>{online ? 'Le fond de carte boude. Réessayez dans un instant.' : 'Pas de réseau, pas de fond de carte. Les bivouacs, eux, restent là.'}</span>
            {online && <button type="button" aria-label="Réessayer le chargement de la carte" title="Réessayer" onClick={() => { setTileError(false); setTileAttempt((attempt) => attempt + 1) }}><RefreshCw size={16} aria-hidden="true" /></button>}
          </div>
        )}
        {located.length === 0 && (
          <div className="map-empty-note">
            <span className="map-empty-icon"><MapPin size={24} aria-hidden="true" /></span>
            <h3>Rien à placer sur la carte</h3>
            <p>Aucun lieu de cette sélection n’a de coordonnées, et on ne place rien au hasard. Ajoutez une position vérifiée dans une fiche pour la voir apparaître ici.</p>
            {firstMissing && <button type="button" onClick={() => onSelect(firstMissing.id)}>Compléter une fiche <ArrowUpRight size={16} aria-hidden="true" /></button>}
          </div>
        )}
      </div>
      {missing > 0 && (
        <div className="map-missing-note">
          <MapPin size={17} aria-hidden="true" />
          <p><strong>{missing} {missing === 1 ? 'bivouac sans coordonnées' : 'bivouacs sans coordonnées'}.</strong> Pas perdus, juste pas placés : ils sont dans la liste. Une position vérifiée, ajoutée depuis leur fiche, les fera apparaître ici.</p>
        </div>
      )}
    </section>
  )
}
