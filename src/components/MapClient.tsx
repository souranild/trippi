'use client'

import { MapContainer, TileLayer, Marker, Polyline, useMap, Tooltip, ZoomControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

interface Place {
  id: string
  name: string
  location: string
  lat?: number
  lng?: number
  day?: number
  emoji?: string
  tripId?: string
  tripTitle?: string
  tripDates?: string
}

interface MapProps {
  places: Place[]
  emoji?: string
  className?: string
  focusedPlaceId?: string | null
  showDayNumbers?: boolean
  previewCoords?: { lat: number, lng: number } | null
  onClick?: (coords: { lat: number, lng: number }) => void
}

function MapLifecycle({ onMapReady }: { onMapReady?: (map: L.Map) => void }) {
  const map = useMap()
  
  useEffect(() => {
    if (onMapReady) {
      onMapReady(map)
    }
    
    // Cleanup function
    return () => {
      // The map will be cleaned up by React Leaflet
    }
  }, [map, onMapReady])
  
  return null
}

function RecenterMap({ places, focusedPlaceId, previewCoords }: { places: Place[]; focusedPlaceId?: string | null, previewCoords?: { lat: number, lng: number } | null }) {
  const map = useMap()
  const [hasInteracted, setHasInteracted] = useState(false)
  const [lastPreviewCoords, setLastPreviewCoords] = useState<{ lat: number, lng: number } | null>(null)

  useEffect(() => {
    const onInteraction = () => setHasInteracted(true)
    map.on('movestart', onInteraction)
    return () => {
      map.off('movestart', onInteraction)
    }
  }, [map])

  useEffect(() => {
    // Always recenter on previewCoords when they change
    if (previewCoords && (lastPreviewCoords?.lat !== previewCoords.lat || lastPreviewCoords?.lng !== previewCoords.lng)) {
      setLastPreviewCoords(previewCoords)
      // Center slightly north of the preview location to show more south area
      const offsetLat = previewCoords.lat + 0.005 // Offset by ~500 meters north
      map.setView([offsetLat, previewCoords.lng], 15)
      return
    }

    if (hasInteracted) return

    if (focusedPlaceId) {
      const place = places.find(p => p.id === focusedPlaceId)
      if (place && place.lat !== undefined && place.lng !== undefined) {
        map.flyTo([place.lat, place.lng], 14, {
          animate: true,
          duration: 1.5
        })
        return
      }
    }

    // Auto-fit all places when no specific place is focused and user hasn't interacted
    const validPlaces = places.filter(p => p.lat !== undefined && p.lng !== undefined)
    if (validPlaces.length > 0) {
      const bounds = L.latLngBounds(validPlaces.map(p => [p.lat!, p.lng!]))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    }
  }, [places, focusedPlaceId, map, hasInteracted, previewCoords, lastPreviewCoords])

  return null
}

function MapEvents({ onZoomChange, onClick }: { onZoomChange: (zoom: number) => void, onClick?: (coords: { lat: number, lng: number }) => void }) {
  const map = useMap()
  
  useEffect(() => {
    const handleZoom = () => onZoomChange(map.getZoom())
    map.on('zoomend', handleZoom)
    
    if (onClick) {
      const handleClick = (e: L.LeafletMouseEvent) => {
        const coords = { lat: e.latlng.lat, lng: e.latlng.lng }
        // Center the map slightly north of the clicked location to show more south area
        const offsetLat = coords.lat + 0.005 // Offset by ~500 meters north
        map.setView([offsetLat, coords.lng], 15)
        onClick(coords)
      }
      map.on('click', handleClick)
      return () => {
        map.off('zoomend', handleZoom)
        map.off('click', handleClick)
      }
    }
    
    return () => {
      map.off('zoomend', handleZoom)
    }
  }, [map, onZoomChange, onClick])

  return null
}

function createIcon(emoji: string, showDayNumbers: boolean, dayNumber?: number, isPreview?: boolean) {
  return L.divIcon({
    html: `
      <div class="flex items-center justify-center w-8 h-8 ${showDayNumbers ? 'bg-primary' : (isPreview ? 'bg-red-500 animate-pulse' : 'bg-primary/40')} rounded-full border-2 border-neutral-900 text-black font-bold text-sm shadow-lg backdrop-blur-sm">
        ${showDayNumbers ? (dayNumber || emoji) : (isPreview ? '📍' : emoji)}
      </div>
    `,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

export default function MapClient({ places, emoji = '📍', className, focusedPlaceId, showDayNumbers = true, previewCoords, onClick }: MapProps) {
  const router = useRouter()
  const [zoom, setZoom] = useState(10)
  const validPlaces = places.filter(p => p.lat !== undefined && p.lng !== undefined)

  // Create markers for preview coords
  const previewMarkers = previewCoords ? [{ id: 'preview', lat: previewCoords.lat, lng: previewCoords.lng, name: 'Selected Location' }] : []

  // Create polyline coordinates for connecting places
  // We want to show paths if zoomed in OR in trip view
  const shouldShowPaths = showDayNumbers || zoom > 5
  
  const polylineCoords = shouldShowPaths
    ? [...validPlaces]
        .sort((a, b) => (a.day || 0) - (b.day || 0))
        .map(place => [place.lat!, place.lng!] as [number, number])
    : []

  // Create a unique key based on places to force remount when places change significantly
  const mapKey = validPlaces.map(p => p.id).sort().join('-')

  return (
    <div className={className || "h-[600px] w-full bg-neutral-900 rounded-xl overflow-hidden relative shadow-inner"}>
      <MapContainer
        key={mapKey}
        center={validPlaces.length > 0 ? [validPlaces[0].lat!, validPlaces[0].lng!] : [0, 0]}
        zoom={validPlaces.length > 0 ? 10 : 2}
        scrollWheelZoom={true}
        zoomControl={false}
        className="h-full w-full"
      >
        <MapLifecycle />
        <MapEvents onZoomChange={setZoom} onClick={onClick} />
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <RecenterMap places={validPlaces} focusedPlaceId={focusedPlaceId} previewCoords={previewCoords} />

        {previewCoords && (
          <Marker
            position={[previewCoords.lat, previewCoords.lng]}
            icon={createIcon(emoji, false, undefined, true)}
          />
        )}

        {validPlaces.map((place, index) => (
          <Marker
            key={place.id}
            position={[place.lat!, place.lng!]}
            icon={createIcon(place.emoji || emoji, showDayNumbers, showDayNumbers ? (place.day || index + 1) : undefined)}
            eventHandlers={{
              click: () => {
                if (place.tripId && !showDayNumbers) {
                  router.push(`/trip/${place.tripId}?place=${place.id}`)
                }
              },
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -20]}
              permanent={false}
              className="custom-tooltip font-medium text-xs p-0 border-none bg-transparent shadow-none"
            >
              <div className="bg-neutral-900/95 backdrop-blur-md text-white p-3 rounded-2xl border border-white/10 shadow-2xl min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                  <span className="text-lg leading-none">{place.emoji || emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate line-clamp-1">{place.name}</h4>
                    <p className="text-[10px] text-neutral-400 truncate">{place.location}</p>
                  </div>
                </div>
                
                {!showDayNumbers && (place.tripTitle || place.tripDates) && (
                  <div className="space-y-1.5 mt-1">
                    {place.tripTitle && (
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[12px] text-primary">trip</span>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider truncate">{place.tripTitle}</span>
                      </div>
                    )}
                    {place.tripDates && (
                      <div className="flex items-center gap-1.5 text-neutral-500">
                        <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                        <span className="text-[9px] font-medium">{place.tripDates}</span>
                      </div>
                    )}
                    <div className="pt-2 flex justify-end">
                      <span className="text-[8px] font-bold text-primary/60 uppercase tracking-tighter flex items-center gap-0.5">
                        Click to view Trip
                        <span className="material-symbols-outlined text-[8px]">arrow_forward</span>
                      </span>
                    </div>
                  </div>
                )}

                {showDayNumbers && place.day && (
                  <div className="flex items-center gap-1.5 text-primary">
                    <span className="material-symbols-outlined text-[12px] font-bold">event</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Day {place.day}</span>
                  </div>
                )}
              </div>
            </Tooltip>
          </Marker>
        ))}

        {polylineCoords.length > 1 && (
          <Polyline
            positions={polylineCoords}
            color="#8ff5ff"
            weight={2}
            opacity={0.7}
            dashArray="5, 5"
          />
        )}
      </MapContainer>
    </div>
  )
}