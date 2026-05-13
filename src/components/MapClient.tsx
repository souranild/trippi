'use client'

import { MapContainer, TileLayer, Marker, Polyline, useMap, Tooltip, ZoomControl, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState, useMemo, useRef, Fragment, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { transportModeIcon } from '@/lib/transport-options'
import type { Transport, TransportMode, Place as StoragePlace } from '@/lib/storage'
import { fetchHybridDiscovery, calculateDistance, enrichDiscoveryResult, searchLocations, type DiscoveryResult, MAP_ICON, formatDistance } from '@/lib/discovery'
import { useMapContext } from '@/context/MapContext'

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
L.Marker.prototype.options.autoPanOnFocus = false

interface Place extends StoragePlace {
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
  onMapClick?: (coords: { lat: number, lng: number }) => void
  onViewportChange?: (center: { lat: number, lng: number }, zoom: number, bounds?: any) => void
  searchResults?: DiscoveryResult[]
  selectedSearchResultId?: string | null
  onSearchResultClick?: (hit: DiscoveryResult) => void
  onSearchChange?: (query: string) => void
  mapStyle?: string
  onStyleChange?: (style: string) => void
  isGlobal?: boolean
  showControls?: boolean
  livePlaceId?: string | null
  liveTransportId?: string | null
  isPreview?: boolean
  onAddDiscovery?: (discovery: any) => void
  defaultDiscovery?: boolean
  onMarkerClick?: (place: Place) => void
  focusedTransportId?: string | null
  onOpenTransport?: (transport: any, fromName: string, toName: string) => void
}

function MapLifecycle({ onMapReady }: { onMapReady?: (map: L.Map) => void }) {
  const map = useMap()
  
  useEffect(() => {
    if (onMapReady) {
      onMapReady(map)
    }

    const safeInvalidate = () => {
      try {
        if (map && map.getContainer()) {
          map.invalidateSize();
        }
      } catch (e) {
        // Ignore internal leaflet errors when container is not fully mounted
      }
    };

    // Initial check
    safeInvalidate();
    
    // Force a resize check after short delays to handle drawers/animations
    // This is critical for maps that start in hidden or animating containers
    const t1 = setTimeout(() => {
      safeInvalidate();
    }, 300);

    const t2 = setTimeout(() => {
      safeInvalidate();
    }, 800);

    const t3 = setTimeout(() => {
      safeInvalidate();
    }, 2000);

    // Cleanup function
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    }
  }, [map, onMapReady])
  
  return null
}

function RecenterMap({ places, focusedPlaceId, previewCoords, isGlobal, isFollowing }: { places: Place[]; focusedPlaceId?: string | null, previewCoords?: { lat: number, lng: number } | null, isGlobal?: boolean, isFollowing?: boolean }) {
  const map = useMap()
  const [hasInteracted, setHasInteracted] = useState(false)
  const [isProgrammatic, setIsProgrammatic] = useState(false)
  const [lastPreviewCoords, setLastPreviewCoords] = useState<{ lat: number, lng: number } | null>(null)
  const [hasAutomaticallyCenteredGlobal, setHasAutomaticallyCenteredGlobal] = useState(false)
  const [lastFocusPointString, setLastFocusPointString] = useState<string>('')
  const [lastCollectionString, setLastCollectionString] = useState<string>('')
  const [lastFocusId, setLastFocusId] = useState<string | null>(null)
  const [lastFollowing, setLastFollowing] = useState(false)

  // Interaction tracking state

  useEffect(() => {
    const onInteraction = () => {
      if (!isProgrammatic) {
        setHasInteracted(true)
      }
    }
    map.on('dragstart', onInteraction)
    map.on('zoomstart', onInteraction)
    map.on('dblclick', onInteraction)
    return () => {
      map.off('dragstart', onInteraction)
      map.off('zoomstart', onInteraction)
      map.off('dblclick', onInteraction)
    }
  }, [map, isProgrammatic])

  // Reset hasInteracted when isFollowing is turned on or target changes
  useEffect(() => {
    if (isFollowing) {
      setHasInteracted(false)
    }
  }, [isFollowing, focusedPlaceId, previewCoords])

  useEffect(() => {
    const validPlaces = places.filter(p => p.lat != null && p.lng != null && !isNaN(Number(p.lat)) && !isNaN(Number(p.lng)))
    const currentCollectionString = validPlaces.map(p => `${p.lat},${p.lng}`).join('|')
    const focusPoint = focusedPlaceId ? places.find(p => p.id === focusedPlaceId) : null
    const focusPointValid = focusPoint && focusPoint.lat != null && focusPoint.lng != null && !isNaN(Number(focusPoint.lat)) && !isNaN(Number(focusPoint.lng))
    const focusPointString = focusPointValid ? `${focusPoint.lat},${focusPoint.lng}` : ''

    // Always recenter on previewCoords when they change
    if (previewCoords && 
        !isNaN(Number(previewCoords.lat)) && 
        !isNaN(Number(previewCoords.lng)) && 
        (lastPreviewCoords?.lat !== previewCoords.lat || lastPreviewCoords?.lng !== previewCoords.lng)) {
      setLastPreviewCoords(previewCoords)
      setIsProgrammatic(true)
      const offsetLat = Number(previewCoords.lat) + 0.005
      map.stop(); // Prevent conflict
      map.setView([offsetLat, Number(previewCoords.lng)], 15)
      setTimeout(() => setIsProgrammatic(false), 2000)
      return
    }

    if (hasInteracted && !isGlobal && !isFollowing) return 
    if (isGlobal && hasAutomaticallyCenteredGlobal) return

    if (focusedPlaceId) {
      if (focusPointValid) {
        // Trigger if: Focus ID changes OR Coordinates change OR Following was just turned on
        const focusChanged = lastFocusId !== focusedPlaceId || lastFocusPointString !== focusPointString;
        const followingJustStarted = isFollowing && !lastFollowing;
        
        if (focusChanged || followingJustStarted) {
          setLastFocusId(focusedPlaceId)
          setLastFocusPointString(focusPointString)
          setLastFollowing(isFollowing || false)
          setIsProgrammatic(true)
          
          // If following just started, force zoom to a good detail level (14)
          // Otherwise maintain zoom or zoom in to at least 14
          const targetZoom = followingJustStarted ? 15 : (map.getZoom() < 15 ? 15 : map.getZoom());
          
          // Stop any current animation to prevent conflicts
          map.stop();
          
          map.flyTo([Number(focusPoint.lat), Number(focusPoint.lng)], targetZoom, {
            animate: true,
            duration: 1.5
          })
          
          setTimeout(() => setIsProgrammatic(false), 2000)
        }
      }
    } else {
      // Also update lastFollowing state if no focus item
      if (isFollowing !== lastFollowing) setLastFollowing(isFollowing || false);
    }

    if (validPlaces.length > 0) {
      // Only fitBounds if the set of coordinates changed
      if (lastCollectionString !== currentCollectionString) {
        setLastCollectionString(currentCollectionString)
        const bounds = L.latLngBounds(validPlaces.map(p => [p.lat!, p.lng!]))
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
        if (isGlobal) setHasAutomaticallyCenteredGlobal(true)
      }
    }
  }, [places, focusedPlaceId, map, hasInteracted, previewCoords, lastPreviewCoords, isGlobal, hasAutomaticallyCenteredGlobal, lastCollectionString, lastFocusPointString, lastFocusId, isFollowing, lastFollowing])

  return null
}

function MapEvents({ onZoomChange, onClick, onViewportChange, onMarkerClick, onMoveEnd }: { 
  onZoomChange: (zoom: number) => void, 
  onClick?: (coords: { lat: number, lng: number }) => void,
  onViewportChange?: (center: { lat: number, lng: number }, zoom: number, bounds?: { s: number, w: number, n: number, e: number }) => void,
  onMarkerClick?: (place: Place) => void,
  onMoveEnd?: (center: { lat: number, lng: number }) => void
}) {
  const map = useMap()
  
  useEffect(() => {
    const handleEvents = () => {
      // Use a timeout or requestAnimationFrame to break the synchronous cycle
      requestAnimationFrame(() => {
        try {
          // Check if map still exists and has a container (essential for Leaflet methods)
          if (!map || !map.getContainer()) return
          
          onZoomChange(map.getZoom())
          if (onViewportChange) {
            const center = map.getCenter()
            const bounds = map.getBounds()
            if (center && !isNaN(center.lat) && !isNaN(center.lng)) {
              onViewportChange({ lat: center.lat, lng: center.lng }, map.getZoom(), {
                s: bounds.getSouth(),
                w: bounds.getWest(),
                n: bounds.getNorth(),
                e: bounds.getEast()
              })
            }
          }
          if (onMoveEnd) {
            const center = map.getCenter()
            onMoveEnd({ lat: center.lat, lng: center.lng })
          }
        } catch (e) {
          console.warn('Map interaction error:', e)
        }
      })
    }
    
    if (map) {
      map.on('zoomend', handleEvents)
      map.on('moveend', handleEvents)
    }
    
    const handleClick = (e: L.LeafletMouseEvent) => {
      // Prevent click on markers or other UI elements from triggering map click
      const target = e.originalEvent.target as HTMLElement
      // Check for Leaflet-specific elements and our custom floating controls
      if (
        target.closest('.leaflet-marker-icon') || 
        target.closest('.leaflet-popup') || 
        target.closest('.leaflet-control') ||
        target.closest('.search-result-marker') ||
        target.closest('button') ||
        target.closest('.z-\\[1000\\]') ||
        target.closest('.z-\\[1001\\]')
      ) {
        return;
      }
      
      if (onClick) {
        const coords = { lat: e.latlng.lat, lng: e.latlng.lng }
        onClick(coords)
      }
    }
    
    map.on('click', handleClick)
    
    // Initial report is intentionally omitted or throttled to prevent update loops
    // handleEvents() // Removed to prevent infinite update depth
    
    return () => {
      map.off('zoomend', handleEvents)
      map.off('moveend', handleEvents)
      map.off('click', handleClick)
    }
  }, [map, onZoomChange, onClick, onViewportChange, onMoveEnd])

  return null
}

function getIconForType(type?: string) {
  if (!type) return 'location_on';
  const t = type.toLowerCase();
  if (t === 'restaurant' || t === 'fast_food' || t === 'food_court') return 'restaurant';
  if (t === 'cafe') return 'local_cafe';
  if (t === 'local_bar' || t === 'pub' || t === 'bar') return 'local_bar';
  if (t === 'museum' || t === 'gallery') return 'museum';
  if (t === 'park' || t === 'nature_reserve' || t === 'forest' || t === 'garden') return 'park';
  if (t === 'historic' || t === 'castle' || t === 'monument' || t === 'fort') return 'castle';
  if (t === 'viewpoint') return 'visibility';
  if (t === 'attraction') return 'stars';
  if (t === 'hotel' || t === 'apartment' || t === 'hostel' || t === 'motel') return 'hotel';
  if (t === 'airport') return 'flight';
  if (t === 'station' || t === 'subway') return 'train';
  if (t === 'beach') return 'beach_access';
  return 'location_on';
}

function createIcon(emoji: string, showDayNumbers: boolean, name?: string, dayLabel?: string, isPreview?: boolean, isFocused?: boolean, isSearchResult?: boolean, zoom: number = 10, isDiscovery?: boolean, isLive: boolean = false, type?: string) {
  const markerColor = isLive ? '#8ff5ff' : isFocused ? '#8ff5ff' : isSearchResult ? '#fbbf24' : isDiscovery ? (
    type === 'restaurant' || type === 'fast_food' ? '#f87171' : // Red
    type === 'cafe' ? '#fb923c' : // Orange
    type === 'local_bar' || type === 'pub' ? '#c084fc' : // Purple
    type === 'museum' ? '#60a5fa' : // Blue
    type === 'park' || type === 'nature_reserve' ? '#4ade80' : // Green
    type === 'historic' || type === 'castle' ? '#fbbf24' : // Amber
    '#818cf8' // Indigo default
  ) : '#8ff5ff'

  // Icon Selection for Discovery
  const iconName = isDiscovery ? getIconForType(type) : emoji;

  if (isSearchResult) {
    return L.divIcon({
      html: `
        <div class="relative group">
          <div class="w-8 h-8 rounded-full bg-neutral-900 border-2 border-[#fbbf24] flex items-center justify-center shadow-2xl transition-all duration-300 group-hover:scale-125">
            <span class="material-symbols-outlined text-[16px] text-[#fbbf24]">search</span>
          </div>
        </div>
      `,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })
  }

  if (isDiscovery) {
    const discoverySize = zoom < 8 ? 20 : zoom < 12 ? 28 : 36;
    return L.divIcon({
      html: `
        <div class="relative group">
          <div class="flex items-center justify-center bg-neutral-950/80 rounded-xl border-2 shadow-[0_4px_15px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-300 transform-gpu cursor-pointer group-hover:scale-110 group-hover:shadow-[0_0_20px_${markerColor}44]" 
               style="width: ${discoverySize}px; height: ${discoverySize}px; border-color: ${markerColor}66;">
            <span class="material-symbols-outlined" style="color: ${markerColor}; font-size: ${discoverySize * 0.55}px;">${iconName}</span>
          </div>
          ${zoom >= 14 ? `<div class="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 bg-neutral-950/90 border border-white/10 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100]">
            <span class="text-[9px] font-bold text-white">${name || 'Point of Interest'}</span>
          </div>` : ''}
        </div>
      `,
      className: 'custom-marker discovery-marker',
      iconSize: [discoverySize, discoverySize],
      iconAnchor: [discoverySize / 2, discoverySize / 2],
    })
  }
  // Standard Trip Marker with Emoji, Name and Day
  if (name) {
    const isMainMap = showDayNumbers;
    // Only show name label when zoomed in enough (≥13) on global map; always show on trip itinerary map or if focused
    const showLabel = isMainMap || zoom >= 13 || isFocused;
    return L.divIcon({
      html: `
        <div class="flex flex-col items-center group ${isLive ? 'z-50 scale-110' : 'z-40'} transition-all duration-300">
          <div class="flex items-center gap-2.5 bg-neutral-900/90 backdrop-blur-xl border-2 ${isLive ? 'border-primary ring-2 ring-primary/20' : (isFocused ? 'border-primary ring-4 ring-primary/30' : 'border-white/10 hover:border-primary/50')} rounded-2xl py-1.5 px-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 group-hover:shadow-primary/20 group-hover:-translate-y-1 cursor-pointer">
             <div class="w-7 h-7 flex items-center justify-center bg-white/5 rounded-xl text-lg leading-none shrink-0 border border-white/5 group-hover:bg-primary/20 transition-colors">
               ${emoji}
             </div>
             ${showLabel ? `
             <div class="flex flex-col min-w-0 pr-1">
               <span class="text-[10px] font-bold text-white leading-tight truncate max-w-[120px]">${name}</span>
               ${(isMainMap || isLive) ? `
                 <div class="flex items-center gap-1 mt-0.5">
                   <div class="w-1 h-1 rounded-full bg-primary ${isLive ? 'animate-pulse' : ''}"></div>
                   <span class="text-[8px] font-bold text-primary leading-none">${isLive ? 'Active' : dayLabel}</span>
                 </div>
               ` : ''}
             </div>
             ` : ''}
          </div>
          <div class="w-px h-2 bg-gradient-to-b from-primary/50 to-transparent"></div>
        </div>
      `,
      className: 'custom-marker',
      iconSize: [40, 40],
      iconAnchor: showLabel ? [20, 45] : [16, 38],
    })
  }

  // Fallback icon logic for global view / missing names
  const iconSize = zoom < 8 ? 44 : 32;
  const emojiSize = zoom < 8 ? 'text-2xl' : 'text-base';
  
  return L.divIcon({
    html: `
      <div class="flex items-center justify-center transition-all duration-500 transform-gpu cursor-pointer ${isFocused ? 'z-50' : ''}">
        <div class="flex items-center justify-center rounded-full border-2 border-neutral-900 bg-primary shadow-[0_0_20px_rgba(34,211,238,0.4)] ${isFocused ? 'scale-125 ring-4 ring-white ring-offset-2 ring-offset-neutral-900' : ''}" style="width: ${iconSize}px; height: ${iconSize}px;">
          <span class="${emojiSize} leading-none">${isPreview ? '📍' : emoji}</span>
        </div>
      </div>
    `,
    className: 'custom-marker',
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2],
  })
}

function createTransportIcon(iconName: string, rotation: number = 0, isTravelIcon: boolean = false, isLive: boolean = false, isFocused: boolean = false) {
  const highlight = (isLive || isFocused) && !!iconName;
  return L.divIcon({
    html: `
      <div class="flex items-center justify-center transition-all duration-300 relative ${
        highlight
          ? 'w-10 h-10 bg-primary text-slate-950 shadow-[0_0_30px_rgba(195,244,0,0.8)] border-2 border-white ring-4 ring-primary/30 scale-110'
          : isTravelIcon 
            ? 'w-8 h-8 bg-neutral-900 text-primary border border-primary/40 shadow-lg' 
            : 'w-6 h-6 bg-neutral-800 text-primary border border-primary/30 shadow-md'
      } rounded-full" style="transform: rotate(${rotation}deg)">
        ${highlight ? '<div class="absolute -inset-2 rounded-full border-2 border-primary animate-ping opacity-30"></div>' : ''}
        <span class="material-symbols-outlined !text-[18px] ${isTravelIcon || highlight ? 'font-black' : 'font-bold'}">${iconName}</span>
      </div>
    `,
    className: `transport-marker ${highlight ? 'z-[2000]' : isTravelIcon ? 'z-[1000]' : 'z-[300]'}`,
    iconSize: highlight ? [40, 40] : isTravelIcon ? [36, 36] : [24, 24],
    iconAnchor: highlight ? [20, 20] : isTravelIcon ? [18, 18] : [12, 12],
  })
}

function getRotation(p1: [number, number], p2: [number, number]) {
  const dy = p2[0] - p1[0]
  const dx = Math.cos(Math.PI / 180 * p1[0]) * (p2[1] - p1[1])
  return Math.atan2(dy, dx) * 180 / Math.PI
}

type MapStyle = 'midnight' | 'satellite' | 'voyager' | 'retro' | 'dark' | 'cyber' | 'mono' | 'topo'

const TILE_LAYERS: Record<MapStyle, { url: string, attribution: string }> = {
  midnight: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
  },
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  retro: {
    url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap France | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  cyber: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO'
  },
  mono: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; OSM contributors, SRTM | Map style: &copy; OpenTopoMap'
  },
  topo: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; OSM contributors, SRTM | Map style: &copy; OpenTopoMap'
  }
}

export default function MapClient(props: MapProps) {
  const { mapState: contextState } = useMapContext()
  
  // Merge props with context state, props take precedence
  const effectiveProps = { ...contextState, ...props }
  const {
    places = [], 
    emoji = '📍', 
    className, 
    focusedPlaceId, 
    showDayNumbers = true, 
    previewCoords, 
    onMapClick, 
    onViewportChange, 
    onMarkerClick, 
    searchResults = [], 
    selectedSearchResultId, 
    onSearchResultClick, 
    mapStyle: externalMapStyle, 
    onStyleChange,
    isGlobal = false,
    showControls = false,
    livePlaceId,
    liveTransportId,
    isPreview = false,
    onAddDiscovery,
    defaultDiscovery,
    onOpenTransport,
    focusedTransportId
  } = effectiveProps
  const router = useRouter()
  
  // Use memo for initial map state to prevent flickering when props change
  const initialMapState = useMemo(() => {
    const valid = places.filter(p => p.lat != null && p.lng != null && !isNaN(Number(p.lat)) && !isNaN(Number(p.lng)));
    const focusPoint = focusedPlaceId ? places.find(p => p.id === focusedPlaceId) : null;
    const focusPointValid = focusPoint && focusPoint.lat != null && focusPoint.lng != null && !isNaN(Number(focusPoint.lat)) && !isNaN(Number(focusPoint.lng));

    if (focusPointValid) {
      return {
        center: [Number(focusPoint!.lat), Number(focusPoint!.lng)] as [number, number],
        zoom: 15
      };
    }

    if (valid.length > 0) {
      return {
        center: [Number(valid[0].lat), Number(valid[0].lng)] as [number, number],
        zoom: 10
      };
    }

    return {
      center: [20, 0] as [number, number],
      zoom: 2
    };
  }, [focusedPlaceId]); // Only depends on focusedPlaceId for initial mount logic
  const [zoom, setZoom] = useState(10)
  const [activeMap, setActiveMap] = useState<L.Map | null>(null)
  const [mapStyle, setMapStyle] = useState<MapStyle>('voyager')
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false)
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null)

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [localSearchQuery, setLocalSearchQuery] = useState('')
  const [internalSearchResults, setInternalSearchResults] = useState<DiscoveryResult[]>([])
  const { setMapState, setIsMapVisible, isExpanded, setIsExpanded, discoveries, setDiscoveries, selectedDiscovery, setSelectedDiscovery, isDiscoveryDetailModalOpen, setIsDiscoveryDetailModalOpen } = useMapContext()
  const [showDiscovery, setShowDiscovery] = useState(defaultDiscovery !== undefined ? defaultDiscovery : true)
  const [discoveryCategory, setDiscoveryCategory] = useState<string>('attractions')
  const [isFollowing, setIsFollowing] = useState(false)
  
  // Compact Control UI
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false)
  const [isMapMoved, setIsMapMoved] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isEnriching, setIsEnriching] = useState(false)
  const [mapCenterForDiscovery, setMapCenterForDiscovery] = useState<L.LatLng | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const discoveryAbortRef = useRef<AbortController | null>(null)
  const discoveryCacheRef = useRef<Record<string, DiscoveryResult[]>>({})

  const tripId = useMemo(() => {
    // Extract tripId from the first place that has it, or fallback to 'global'
    const firstWithId = (places as any[]).find(p => p.tripId);
    return firstWithId?.tripId || 'global';
  }, [places]);

  const DISCOVERY_CATEGORIES = [
    { id: 'famous', label: 'Famous', icon: 'star', emoji: '🌟', search: 'famous popular tourist attraction landmark' },
    { id: 'attractions', label: 'Sights', icon: 'attractions', emoji: '🏛️', search: 'top tourist attraction monument' },
    { id: 'restaurants', label: 'Food', icon: 'restaurant', emoji: '🍴', search: 'notable famous restaurant' },
    { id: 'cafes', label: 'Cafes', icon: 'local_cafe', emoji: '☕', search: 'popular cafe' },
    { id: 'parks', label: 'Nature', icon: 'park', emoji: '🌳', search: 'major park garden' },
    { id: 'museums', label: 'Museums', icon: 'museum', emoji: '🖼️', search: 'top museum art gallery' },
  ]

  const rawSearchResults = searchResults?.length > 0 ? searchResults : internalSearchResults
  const activeSearchResults = useMemo(() => {
    return rawSearchResults.filter(r => 
      r.lat !== undefined && r.lng !== undefined &&
      !isNaN(Number(r.lat)) && 
      !isNaN(Number(r.lng))
    )
  }, [rawSearchResults])

  // Load style from localStorage or props
  useEffect(() => {
    if (externalMapStyle && TILE_LAYERS[externalMapStyle as MapStyle]) {
      setMapStyle(externalMapStyle as MapStyle)
    } else {
      const saved = localStorage.getItem('trippi_map_style') as MapStyle
      if (saved && TILE_LAYERS[saved]) {
        setMapStyle(saved)
      }
    }
  }, [externalMapStyle])

  const handleStyleChange = (style: MapStyle) => {
    setMapStyle(style)
    if (onStyleChange) {
      onStyleChange(style)
    } else {
      localStorage.setItem('trippi_map_style', style)
    }
  }

  // Trigger discovery fetch when enabled or map ready
  useEffect(() => {
    if (showDiscovery && activeMap && discoveries.length === 0) {
      const center = activeMap.getCenter();
      setMapCenterForDiscovery(center);
      fetchTopPlaces({ lat: center.lat, lng: center.lng });
    }
    
    return () => {
      discoveryAbortRef.current?.abort();
    };
  }, [showDiscovery, activeMap]);

  // Load cached discoveries on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && discoveries.length === 0 && tripId) {
      const saved = sessionStorage.getItem(`trippi-discoveries-${tripId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setDiscoveries(parsed);
          }
        } catch (e) {}
      }
    }
  }, [tripId]);

  // Save discoveries to cache
  useEffect(() => {
    if (typeof window !== 'undefined' && discoveries.length > 0 && tripId) {
      sessionStorage.setItem(`trippi-discoveries-${tripId}`, JSON.stringify(discoveries));
    }
  }, [discoveries, tripId]);

  const validPlaces = places.filter(p => p.lat != null && p.lng != null && !isNaN(Number(p.lat)) && !isNaN(Number(p.lng)))

  // Create coordinates for search results - with NaN protection
  const searchMarkers = searchResults.filter(r => 
    r && 
    !isNaN(Number(r.lat)) && 
    !isNaN(Number(r.lng))
  );

  // Create polyline coordinates for connecting places - ONLY for itinerary view
  const shouldShowPaths = showDayNumbers
  
  const polylineCoords = useMemo(() => {
    if (!shouldShowPaths) return [];
    return [...validPlaces]
      .sort((a, b) => (a.day || 0) - (b.day || 0))
      .map(place => [Number(place.lat), Number(place.lng)] as [number, number])
      .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
  }, [validPlaces, shouldShowPaths])

  // Create a unique key based on places + discoveries to force reactivity when either changes
  const mapKey = useMemo(() => {
    const itineraryIds = validPlaces.map(p => p.id).sort().join('-');
    const discoveryIds = discoveries.map(p => p.id).sort().join('-');
    return `${itineraryIds}_${discoveryIds}`;
  }, [validPlaces, discoveries]);

  // Track coordinate frequency to jitter overlapping markers
  const coordinateFrequency = useMemo(() => {
    const counts: Record<string, number> = {};
    validPlaces.forEach(p => {
      const key = `${Number(p.lat).toFixed(6)},${Number(p.lng).toFixed(6)}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [validPlaces]);

  const coordinateInstancesRef = useRef<Record<string, number>>({});

  const handleMarkerClick = (place: Place, originalEvent?: any) => {
    if (originalEvent && typeof originalEvent.stopPropagation === 'function') {
      originalEvent.stopPropagation();
    } else if (originalEvent?.originalEvent?.stopPropagation) {
      originalEvent.originalEvent.stopPropagation();
    }

    const lat = Number(place.lat);
    const lng = Number(place.lng);

    if (place.tripId && !showDayNumbers) {
      router.push(`/trip?id=${place.tripId}&place=${place.id}`)
    } else {
      if (activeMap && !isNaN(lat) && !isNaN(lng)) {
        // If already more zoomed in than 15, don't zoom out
        const targetZoom = Math.max(activeMap.getZoom(), 15);
        activeMap.flyTo([lat, lng], targetZoom, { animate: true, duration: 1 })
      }
      if (onMarkerClick) onMarkerClick(place);
    }
  }

  const handleHover = (placeId: string | null) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    
    if (placeId) {
      setHoveredPlaceId(placeId)
    } else {
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredPlaceId(null)
      }, 150)
    }
  }
  const performSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setInternalSearchResults([])
      return
    }

    try {
      if (activeMap) {
        discoveryAbortRef.current?.abort();
        discoveryAbortRef.current = new AbortController();
        
        const center = activeMap.getCenter();
        const results = await searchLocations(query, center.lat, center.lng, discoveryAbortRef.current.signal);
        const hits: DiscoveryResult[] = results.map(res => ({
          id: res.id,
          name: res.name,
          location: res.tags['addr:city'] || res.tags['addr:full'] || '',
          lat: res.lat, lng: res.lng,
          type: res.type as any,
          emoji: '📍',
          image: res.image,
          description: res.description,
          tags: res.tags
        }));
        
        setInternalSearchResults(hits);

        // Auto-fit bounds if we have results
        if (hits.length > 0) {
          const coords = hits.map(h => [h.lat, h.lng] as [number, number]);
          const bounds = L.latLngBounds(coords);
          activeMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Map search failed', e)
      }
    }
  }

  const debouncedSearch = useMemo(() => {
    let timeout: NodeJS.Timeout;
    return (q: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => performSearch(q), 500);
    };
  }, []);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalSearchQuery(value)
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value)
    }, 500)
  }


  const fetchTopPlaces = async (center: { lat: number, lng: number } | L.LatLng, categoryId?: string) => {
    if (isSearching) return;
    setIsSearching(true);
    discoveryAbortRef.current?.abort();
    discoveryAbortRef.current = new AbortController();

    try {
      const finalCategoryId = categoryId || discoveryCategory;
      const bounds = activeMap?.getBounds();
      
      if (!center || isNaN((center as any).lat) || isNaN((center as any).lng)) {
        setIsSearching(false);
        return;
      }

      // 1. Check Component Cache First
      const cacheKey = `${Math.floor((center as any).lat)}_${Math.floor((center as any).lng)}_${finalCategoryId}`;
      if (discoveryCacheRef.current[cacheKey] && discoveryCacheRef.current[cacheKey].length > 0) {
        const cachedResults = discoveryCacheRef.current[cacheKey];
        setDiscoveries(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const filteredNew = cachedResults.filter(s => !existingIds.has(s.id));
          // Limit total discoveries to 40 for performance and clarity
          return [...prev, ...filteredNew].slice(-40);
        });
        setIsSearching(false);
        setIsMapMoved(false);
        return;
      }

      const bbox = bounds ? {
        s: bounds.getSouth(),
        w: bounds.getWest(),
        n: bounds.getNorth(),
        e: bounds.getEast()
      } : undefined;

      const results = await fetchHybridDiscovery((center as any).lat, (center as any).lng, finalCategoryId, discoveryAbortRef.current.signal, bbox);
      
      const newSuggestions = results.map(res => {
        const cat = DISCOVERY_CATEGORIES.find(c => c.id === finalCategoryId) || DISCOVERY_CATEGORIES[0];
        return {
          id: res.id,
          name: res.name,
          location: res.tags['addr:city'] || '',
          lat: res.lat, lng: res.lng,
          type: res.type as any,
          emoji: cat.emoji,
          image: res.image,
          tags: res.tags
        };
      });

      // 2. Update Component Cache
      if (newSuggestions.length > 0) {
        discoveryCacheRef.current[cacheKey] = newSuggestions;
      }

      // Merge and deduplicate by ID
      setDiscoveries(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const filteredNew = newSuggestions.filter(s => !existingIds.has(s.id));
        // Limit total discoveries to 40 for performance and clarity
        return [...prev, ...filteredNew].slice(-40);
      });
      
      // BACKGROUND ENRICHMENT: Fetch rich details one by one
      const enrichTargets = newSuggestions.filter(s => (s as any).tags?.wikipedia).slice(0, 10);
      
      if (enrichTargets.length > 0) {
        setIsEnriching(true);
        const enrichmentPromises = enrichTargets.map(async (item) => {
          try {
            const enriched = await enrichDiscoveryResult(item as any);
            if (enriched.image || enriched.significance) {
              setDiscoveries(prev => prev.map(p => p.id === enriched.id ? { ...p, ...enriched } : p));
              // Update cache too if it exists
              if (discoveryCacheRef.current[cacheKey]) {
                discoveryCacheRef.current[cacheKey] = discoveryCacheRef.current[cacheKey].map(p => p.id === enriched.id ? { ...p, ...enriched } : p);
              }
            }
          } catch (e) {}
        });
        
        // When all background tasks finish, stop spinning
        Promise.all(enrichmentPromises).finally(() => {
          setIsEnriching(false);
        });
      }

      // Highlight logic: Fit bounds if a category was explicitly clicked
      if (categoryId && newSuggestions.length > 0 && activeMap) {
        const coords = newSuggestions
          .filter(s => s.lat != null && s.lng != null && !isNaN(s.lat) && !isNaN(s.lng))
          .map(s => [s.lat, s.lng] as [number, number]);
        
        if (coords.length > 0) {
          const bounds = L.latLngBounds(coords);
          activeMap.fitBounds(bounds, { padding: [100, 100], maxZoom: 15 });
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Fetch discovery failed', e);
      }
    } finally {
      setIsSearching(false);
      setIsMapMoved(false);
      setMapCenterForDiscovery(null);
    }
  }

  const handleViewportChange = useCallback((center: { lat: number, lng: number }, zoom: number, bounds?: { s: number, w: number, n: number, e: number }) => {
    if (onViewportChange) onViewportChange(center, zoom, bounds)
  }, [onViewportChange])

  return (
    <div className={`${className || "h-[600px]"} w-full bg-neutral-900 overflow-hidden relative shadow-inner z-10 transition-all duration-300 isolation-isolate map-style-${mapStyle}`}>
      <div className="absolute inset-0 z-10">
        {/* Minimal Tool Pill (Top Left) */}
        <div className="absolute top-6 left-4 z-[20] no-print">
          <div className="flex flex-col gap-2">
            <div className="flex items-center bg-neutral-950/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-1 gap-1">
              <button
                onClick={() => setIsStyleModalOpen(!isStyleModalOpen)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isStyleModalOpen ? 'bg-primary text-black' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
                title="Map Style"
              >
                <span className="material-symbols-outlined text-[16px]">layers</span>
              </button>
              
              {!isStyleModalOpen && (
                <>
                  <div className="w-px h-4 bg-white/10 mx-0.5" />
                  <button
                    onClick={() => {
                      if (activeMap && validPlaces.length > 0) {
                        const coords = validPlaces
                          .map(p => [Number(p.lat), Number(p.lng)] as [number, number])
                          .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
                        if (coords.length > 0) {
                          const bounds = L.latLngBounds(coords);
                          activeMap.fitBounds(bounds, { padding: [50, 50], animate: true });
                        }
                      }
                    }}
                    className="w-8 h-8 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl flex items-center justify-center transition-all"
                    title="Fit to Trip"
                  >
                    <span className="material-symbols-outlined text-[16px]">zoom_out_map</span>
                  </button>
                  
                  {showDayNumbers && (
                    <button
                      onClick={() => setIsFollowing(!isFollowing)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isFollowing ? 'bg-primary text-black' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
                      title={isFollowing ? "Unfollow active item" : "Follow active item"}
                    >
                      <span className={`material-symbols-outlined text-[16px] ${isFollowing ? 'animate-pulse' : ''}`}>
                        {isFollowing ? 'location_searching' : 'my_location'}
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>

            {isStyleModalOpen && (
              <div className="bg-neutral-950/90 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 w-40">
                <div className="grid grid-cols-2 gap-1.5">
                  {(['midnight', 'satellite', 'voyager', 'retro', 'dark', 'cyber', 'mono', 'topo'] as MapStyle[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => { handleStyleChange(s); setIsStyleModalOpen(false); }}
                      className={`px-1 py-1.5 rounded-lg text-[9px] font-bold text-center transition-all ${
                        mapStyle === s 
                          ? 'bg-primary/20 text-primary border border-primary/20' 
                          : 'text-neutral-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <MapContainer
          center={initialMapState.center}
          zoom={initialMapState.zoom}
          minZoom={2}
          maxBounds={[[-90, -180], [90, 180]]}
          maxBoundsViscosity={1.0}
          scrollWheelZoom={true}
          zoomControl={false}
          attributionControl={false}
          className="h-full w-full"
          style={{ background: '#171717' }}
        >
          <MapLifecycle onMapReady={setActiveMap} />
          <MapEvents 
            onZoomChange={setZoom} 
            onClick={onMapClick} 
            onViewportChange={handleViewportChange} 
            onMoveEnd={(center) => {
              if (showDiscovery) {
                // If the map moved significantly from where we last fetched
                if (mapCenterForDiscovery) {
                  const dist = calculateDistance(center.lat, center.lng, mapCenterForDiscovery.lat, mapCenterForDiscovery.lng);
                  if (dist > 5) { // 5km move
                    setIsMapMoved(true);
                  }
                } else if (discoveries.length === 0 && !isSearching) {
                  // Initial fetch
                  fetchTopPlaces(center);
                } else if (!isSearching) {
                   // User moved map but we haven't tracked original fetch center
                   setIsMapMoved(true);
                }
              }
            }}
            onMarkerClick={onMarkerClick} 
          />
          <TileLayer
            key={mapStyle}
            attribution={TILE_LAYERS[mapStyle].attribution}
            url={TILE_LAYERS[mapStyle].url}
            noWrap={true}
            bounds={[[-90, -180], [90, 180]]}
          />

          <RecenterMap 
            places={validPlaces} 
            focusedPlaceId={focusedPlaceId} 
            previewCoords={previewCoords} 
            isGlobal={!showDayNumbers}
            isFollowing={isFollowing}
          />

          {/* Floating "Search this area" Button */}
          {showDiscovery && (isMapMoved || isSearching || isEnriching) && (
            <div className="absolute top-24 sm:top-14 left-1/2 -translate-x-1/2 z-[500] animate-in fade-in slide-in-from-top-2 no-print w-full flex justify-center px-4 pointer-events-none">
              <button
                onClick={() => {
                  if (activeMap) {
                    fetchTopPlaces(activeMap.getCenter());
                    setIsMapMoved(false);
                  }
                }}
                disabled={isSearching}
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-1.5 rounded-full font-black text-[10px] sm:text-[11px] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] transition-all active:scale-95 pointer-events-auto border-2 ${
                  (isSearching || isEnriching) 
                    ? 'bg-neutral-950 border-primary text-primary' 
                    : 'bg-amber-400 border-black/10 text-black hover:bg-white hover:scale-105'
                }`}
              >
                <span className={`material-symbols-outlined text-[14px] ${(isSearching || isEnriching) ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                {(isSearching || isEnriching) ? 'Searching...' : 'Search this area'}
              </button>
            </div>
          )}
          
          {/* Internal Follow Component to reset interaction state when needed */}
          
          <ZoomControl position="topright" />

          {/* Render Search Results */}
          {activeSearchResults.map((hit) => (
            <Marker
              key={hit.id}
              position={[hit.lat, hit.lng]}
              icon={createIcon('', false, '', '', false, hit.id === selectedSearchResultId, true, zoom)}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e as any);
                  if (onSearchResultClick) onSearchResultClick(hit);
                  else if (activeMap) {
                    activeMap.setView([hit.lat, hit.lng], 15);
                  }
                },
                mouseover: () => handleHover(hit.id),
                mouseout: () => handleHover(null)
              }}
            >
              <Tooltip 
                direction="top" 
                offset={[0, -10]} 
                className="interactive-discovery-tooltip"
                interactive={true}
                permanent={true}
              >
                <div 
                  onMouseEnter={() => handleHover(hit.id)}
                  onMouseLeave={() => handleHover(null)}
                  onClick={() => {
                    if (onSearchResultClick) onSearchResultClick(hit);
                    else if (activeMap) activeMap.setView([hit.lat, hit.lng], 15);
                  }}
                  className={`bg-neutral-900 border border-white/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col w-[200px] pointer-events-auto transition-all duration-300 group/tt cursor-pointer ${hoveredPlaceId === hit.id || selectedSearchResultId === hit.id ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
                >
                  {hit.image ? (
                    <div className="relative w-full h-24">
                      <img src={hit.image} className="w-full h-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent" />
                    </div>
                  ) : (
                    <div className="w-full h-2 bg-gradient-to-r from-primary/30 to-amber-400/30" />
                  )}
                  
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-[11px] font-bold text-white leading-tight line-clamp-2">{hit.name}</p>
                        <span className="material-symbols-outlined text-primary text-[14px] shrink-0">
                          search
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-bold text-primary">{(hit.type || 'Result').charAt(0).toUpperCase() + (hit.type || 'Result').slice(1)}</span>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-[10px] font-bold text-neutral-400">Search Result</span>
                      </div>

                      <div className="w-full py-1.5 bg-white/10 rounded-lg text-[10px] font-black text-white uppercase tracking-widest hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                        View Details
                      </div>
                    </div>
                  </div>
                </Tooltip>
            </Marker>
          ))}


          {previewCoords && !isNaN(Number(previewCoords.lat)) && !isNaN(Number(previewCoords.lng)) && (
            <Marker
              position={[previewCoords.lat, previewCoords.lng]}
              icon={createIcon(emoji, false, undefined, undefined, true, false, false, zoom)}
            />
          )}

          {(() => {
            // Reset instances for each render pass
            const instances: Record<string, number> = {};
            
            return validPlaces.map((place, idx) => {
              const startDay = Math.max(1, place.day ?? 1)
              const endDay = Math.max(startDay, place.endDay || startDay)
              const isMultiDay = endDay > startDay
              const dayLabel = isMultiDay 
                ? Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i).join('-')
                : `${startDay}`
              const isFocused = place.id === focusedPlaceId
              const isLive = place.id === livePlaceId

              // Calculate jitter for overlapping markers
              const coordKey = `${Number(place.lat).toFixed(6)},${Number(place.lng).toFixed(6)}`;
              const instanceIdx = instances[coordKey] || 0;
              instances[coordKey] = instanceIdx + 1;

              let displayLat = Number(place.lat);
              let displayLng = Number(place.lng);

              // If multiple places share this coordinate, offset them slightly in a spiral
              if (coordinateFrequency[coordKey] > 1) {
                // Use golden angle spiral for more natural distribution
                const goldenAngle = 137.5 * (Math.PI / 180);
                const angle = instanceIdx * goldenAngle;
                // Scale radius slightly with instance count to spread them out
                const radius = 0.00025 * Math.sqrt(instanceIdx); 
                displayLat += radius * Math.cos(angle);
                displayLng += radius * Math.sin(angle);
              }

              return (
                <Marker
                  key={`${place.id}-${idx}`}
                  position={[displayLat, displayLng]}
                  icon={createIcon(place.emoji || emoji, showDayNumbers, place.name, dayLabel, false, (isFocused || hoveredPlaceId === place.id), false, zoom, false, isLive, place.type)}
                  eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e as any);
                    handleMarkerClick(place, e);
                  },
                  mouseover: () => handleHover(place.id),
                  mouseout: () => handleHover(null),
                }}
                zIndexOffset={isFocused || hoveredPlaceId === place.id ? 1000 : 0}
              >
                <Tooltip 
                  direction="top" 
                  offset={[0, -10]} 
                  className="interactive-discovery-tooltip"
                  interactive={true}
                  sticky={false}
                  permanent={true}
                >
                  <div 
                    onMouseEnter={() => handleHover(place.id)}
                    onMouseLeave={() => handleHover(null)}
                    onClick={() => handleMarkerClick(place, {})}
                    className={`bg-neutral-900 border border-white/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col w-[200px] pointer-events-auto transition-all duration-300 group/tt cursor-pointer ${hoveredPlaceId === place.id ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
                  >
                    {place.photos && place.photos.length > 0 ? (
                      <div className="relative w-full h-24">
                        <img src={place.photos[0]} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent" />
                      </div>
                    ) : (
                      <div className="w-full h-2 bg-gradient-to-r from-primary/30 to-blue-400/30" />
                    )}
                    
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-[11px] font-bold text-white leading-tight line-clamp-2">{place.name}</p>
                        <span className="material-symbols-outlined text-primary text-[14px] shrink-0">
                          location_on
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-bold text-primary line-clamp-1">{place.location || 'Location'}</span>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-[10px] font-bold text-neutral-400 shrink-0">Day {startDay}</span>
                      </div>

                      {/* Improved Description (from first note) */}
                      {place.notes && place.notes.length > 0 && (
                        <p className="text-[9px] text-neutral-400 line-clamp-2 mb-3 leading-relaxed opacity-80">
                          {place.notes[0].text.replace(/<[^>]*>/g, '').replace(/\[[ xX]\]/g, '').trim()}
                        </p>
                      )}

                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkerClick(place, {});
                        }}
                        className="w-full py-1.5 bg-white/10 rounded-lg text-[10px] font-black text-white uppercase tracking-widest hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                        View Details
                      </div>
                    </div>
                  </div>
                </Tooltip>
              </Marker>
            )
          })
        })()}

          {(() => {
            const sorted = [...validPlaces].sort((a, b) => (a.day || 0) - (b.day || 0))
            if (sorted.length < 2) return null;

            const segments = []
            for (let i = 0; i < sorted.length - 1; i++) {
              const p1 = sorted[i]
              const p2 = sorted[i + 1]
              const start: [number, number] = [Number(p1.lat), Number(p1.lng)]
              const end: [number, number] = [Number(p2.lat), Number(p2.lng)]
              
              if (isNaN(start[0]) || isNaN(start[1]) || isNaN(end[0]) || isNaN(end[1])) continue;

              const mid: [number, number] = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]
              const angle = getRotation(start, end)
              
              const transport = p1.transport?.find(t => 
                t.to === p2.id || 
                t.to?.toLowerCase() === p2.name?.toLowerCase() ||
                p2.transport?.some(st => st.from === p1.id && st.to === p2.id)
              ) || p2.transport?.find(t => 
                t.from === p1.id || 
                t.from?.toLowerCase() === p1.name?.toLowerCase()
              );
              
              const icon = transport ? transportModeIcon(transport.type) : null
              const isLive = transport?.id && liveTransportId && transport.id === liveTransportId;
              const isFocused = transport?.id && focusedTransportId && transport.id === focusedTransportId;
              const isAnyHighlighted = isLive || isFocused;
              
              let distance = transport?.distance;
              if (!distance && !isNaN(start[0]) && !isNaN(start[1]) && !isNaN(end[0]) && !isNaN(end[1])) {
                const distKm = calculateDistance(start[0], start[1], end[0], end[1]);
                distance = distKm > 0 ? `${distKm.toFixed(1)} km` : undefined;
              }
              
              segments.push({ 
                start, end, mid, angle, icon, 
                id: `${p1.id}-${p2.id}`, 
                transportTitle: transport?.title, 
                isLive, isFocused, isAnyHighlighted,
                distance, transport,
                fromName: p1.name, toName: p2.name
              })
            }

            return (
              <Fragment>
                {/* 1. Base dashed line for the whole route (slightly faded) */}
                <Polyline
                  positions={polylineCoords}
                  color="#8ff5ff"
                  weight={2}
                  opacity={0.3}
                  dashArray="2, 8"
                  lineCap="round"
                  className="transition-all duration-300"
                />

                {/* 2. Individual segments for highlighting and markers */}
                {segments.map(seg => {
                  const isNav = !seg.icon;
                  const iconRotation = isNav ? (90 - seg.angle) : (seg.angle - 90);
                  const highlight = seg.isAnyHighlighted;

                  return (
                    <Fragment key={seg.id}>
                      {/* Segment Line (Highlighted or Faded) */}
                      <Polyline
                        positions={[seg.start, seg.end]}
                        color={highlight ? "#8ff5ff" : "#8ff5ff"}
                        weight={highlight ? 4 : 2}
                        opacity={highlight ? 0.9 : 0.4}
                        dashArray={highlight ? undefined : "1, 10"}
                        lineCap="round"
                        className={`transition-all duration-500 ${highlight ? 'animate-pulse' : ''}`}
                      />
                      
                      {highlight && (
                        <Polyline
                          positions={[seg.start, seg.end]}
                          color="#8ff5ff"
                          weight={12}
                          opacity={0.15}
                          lineCap="round"
                          className="path-glow"
                        />
                      )}

                      {/* Transport Marker */}
                      <Marker 
                        position={seg.mid} 
                        icon={seg.icon 
                          ? createTransportIcon(seg.icon, 0, true, !!seg.isLive, !!seg.isFocused) 
                          : createTransportIcon('near_me', iconRotation, false, !!seg.isLive, !!seg.isFocused)
                        } 
                        interactive={true}
                        eventHandlers={{
                          click: (e) => {
                            L.DomEvent.stopPropagation(e as any);
                            if (seg.transport && onOpenTransport) {
                              onOpenTransport(seg.transport, seg.fromName, seg.toName);
                            }
                          }
                        }}
                        zIndexOffset={highlight ? 2000 : 500}
                      >
                        <Tooltip direction="top" offset={[0, -10]} className="custom-tooltip-wrapper" permanent={Boolean(seg.distance && (zoom >= 12 || highlight))}>
                          <div className="flex flex-col items-center gap-1">
                            {(seg.transportTitle || highlight) && (
                              <div className={`shadow-2xl border px-2 py-1 rounded text-[9px] font-bold uppercase transition-all duration-300 ${
                                highlight ? 'bg-primary border-white text-slate-950 scale-110 shadow-[0_0_15px_rgba(143,245,255,0.5)]' : 'bg-neutral-900 border-white/10 text-primary'
                              }`}>
                                {seg.transportTitle || 'Active Leg'}
                              </div>
                            )}
                            {seg.distance && (
                              <div className={`backdrop-blur-md border px-1.5 py-0.5 rounded-full text-[8px] font-black shadow-lg transition-all duration-300 ${
                                highlight ? 'bg-white border-primary text-slate-950 scale-105' : 'bg-primary/20 border-primary/40 text-primary'
                              }`}>
                                {seg.distance}
                              </div>
                            )}
                          </div>
                        </Tooltip>
                      </Marker>
                    </Fragment>
                  )
                })}
              </Fragment>
            )
          })()}
          {/* Discovery & Search Result Popups */}
          {[...(internalSearchResults || []), ...(discoveries || [])].map(hit => (
            <Marker
              key={`marker-${hit.id}`}
              position={[hit.lat, hit.lng]}
              icon={createIcon('location_on', false, hit.name, '', false, (selectedDiscovery?.id === hit.id || hoveredPlaceId === hit.id), false, zoom, true, false, hit.type)}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e as any);
                  setSelectedDiscovery(hit);
                },
                mouseover: () => handleHover(hit.id),
                mouseout: () => handleHover(null),
              }}
              zIndexOffset={selectedDiscovery?.id === hit.id || hoveredPlaceId === hit.id ? 1000 : 0}
            >
              <Tooltip 
                direction="top" 
                offset={[0, -10]} 
                className="interactive-discovery-tooltip"
                interactive={true}
                permanent={true}
              >
                <div 
                  onMouseEnter={() => handleHover(hit.id)}
                  onMouseLeave={() => handleHover(null)}
                  onClick={() => setSelectedDiscovery(hit)}
                  className={`bg-neutral-900 border border-white/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col w-[200px] pointer-events-auto transition-all duration-300 group/tt cursor-pointer ${hoveredPlaceId === hit.id || selectedDiscovery?.id === hit.id ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
                >
                  {hit.image ? (
                    <div className="relative w-full h-24">
                      <img src={hit.image} className="w-full h-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent" />
                    </div>
                  ) : (
                    <div className="w-full h-2 bg-gradient-to-r from-primary/30 to-blue-400/30" />
                  )}
                  
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-[11px] font-bold text-white leading-tight line-clamp-2">{hit.name}</p>
                        <span className="material-symbols-outlined text-primary text-[14px] shrink-0">
                          {getIconForType(hit.type)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-bold text-primary">{(hit.type || 'Landmark').charAt(0).toUpperCase() + (hit.type || 'Landmark').slice(1)}</span>
                        {hit.distance !== undefined && (
                          <>
                            <div className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-[10px] font-bold text-neutral-400">{formatDistance(hit.distance)}</span>
                          </>
                        )}
                      </div>

                      {hit.description && (
                        <p className="text-[9px] text-neutral-400 line-clamp-2 mb-3 leading-relaxed opacity-80">
                          {hit.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDiscovery(hit);
                            setIsDiscoveryDetailModalOpen(true);
                          }}
                          className="flex-1 py-1.5 bg-white/10 rounded-lg text-[10px] font-black text-white uppercase tracking-widest hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                          View Details
                        </div>
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onAddDiscovery) onAddDiscovery(hit);
                          }}
                          className="w-10 h-8 bg-primary/20 border border-primary/30 rounded-lg flex items-center justify-center text-primary hover:bg-primary hover:text-black transition-all"
                          title="Quick Add"
                        >
                          <span className="material-symbols-outlined text-lg">add</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Tooltip>
            </Marker>
          ))}

        </MapContainer>
      </div>



      {/* Control Center - Collapsible Floating Overlay */}
      {(showDayNumbers || isGlobal || showControls) && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-1.5rem)] max-w-[500px] no-print transition-all duration-500">
          {!isControlPanelOpen ? (
            <div className="flex items-center justify-center">
              <button
                onClick={() => setIsControlPanelOpen(true)}
                className="flex items-center gap-2.5 px-4 h-10 bg-neutral-950/90 backdrop-blur-3xl border border-white/15 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.5)] ring-1 ring-white/5 hover:border-primary/40 hover:bg-neutral-900/90 transition-all duration-300 active:scale-95 group"
              >
                <span className="material-symbols-outlined text-neutral-400 text-[18px] group-hover:text-primary transition-colors">search</span>
                <span className="text-[10px] font-bold text-neutral-400 group-hover:text-white transition-colors tracking-widest uppercase">Search</span>
                <span className="material-symbols-outlined text-neutral-600 text-[16px] group-hover:text-neutral-300 transition-colors">expand_less</span>
              </button>
            </div>
          ) : (
            <div className="bg-neutral-950/90 backdrop-blur-3xl border border-white/10 p-3 sm:p-5 rounded-[2rem] shadow-[0_30px_70px_rgba(0,0,0,0.6)] transition-all duration-300 ring-1 ring-white/5 animate-in slide-in-from-bottom-2 fade-in max-h-[35vh] sm:max-h-none overflow-y-auto custom-scrollbar">
              <div className="sticky top-0 bg-neutral-950/90 backdrop-blur-xl pt-1 pb-2 mb-2 sm:mb-3 z-[20] -mx-1 px-1 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[14px] sm:text-[16px]">search</span>
                      <span className="text-[10px] sm:text-[11px] font-black text-neutral-300 uppercase tracking-widest">Discover</span>
                    </div>

                    <div className="h-4 w-px bg-white/10" />

                    <button
                      onClick={() => {
                        const newState = !showDiscovery;
                        setShowDiscovery(newState);
                        if (newState && activeMap) {
                          fetchTopPlaces(activeMap.getCenter());
                        }
                      }}
                      className={`flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl border transition-all ${showDiscovery ? 'bg-amber-400/10 border-amber-500/30 text-amber-400' : 'bg-white/5 border-white/10 text-neutral-500 hover:text-white'}`}
                    >
                      <span className="material-symbols-outlined text-[14px] sm:text-[16px] items-center justify-center">explore</span>
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">{showDiscovery ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setIsControlPanelOpen(false)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/5 transition-all"
                      title="Collapse"
                    >
                      <span className="material-symbols-outlined text-[16px]">expand_more</span>
                    </button>
                  </div>
                </div>

                <div className="mt-2 sm:mt-3 flex gap-2">
                  <div className="relative flex-1 group">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-primary transition-colors text-[18px]">search</span>
                    <input 
                      type="text" 
                      placeholder="Search landmarks..."
                      value={localSearchQuery}
                      onChange={(e) => {
                        setLocalSearchQuery(e.target.value)
                        debouncedSearch(e.target.value)
                      }}
                      className="flex-1 h-11 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl pl-10 pr-12 text-[13px] text-white placeholder-neutral-500 focus:border-primary/50 outline-none transition-all shadow-inner"
                    />
                    <button 
                      onClick={() => performSearch(localSearchQuery)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-black transition-all flex items-center justify-center group/btn"
                      title="Search"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  </div>
                  <button
                    onClick={() => setShowDiscovery(!showDiscovery)}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all border shrink-0 ${
                      showDiscovery 
                        ? 'bg-amber-400/20 border-amber-400/30 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.1)]' 
                        : 'bg-white/5 border-white/10 text-neutral-500'
                    }`}
                    title={showDiscovery ? 'Discovery ON' : 'Discovery OFF'}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showDiscovery ? 'explore' : 'explore_off'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:gap-4 min-w-0">
                {/* Search Results List */}
                {localSearchQuery && activeSearchResults.length > 0 && (
                  <div className="space-y-4 min-w-0">
                    <div className="h-px bg-white/5 mx-1" />
                    <div className="flex items-center gap-2 px-1">
                       <span className="material-symbols-outlined text-primary text-[14px]">location_on</span>
                       <span className="text-[10px] font-black text-primary uppercase tracking-widest">Search Results</span>
                    </div>
                    <div className="flex gap-2.5 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 min-w-0 w-full max-w-full touch-pan-x">
                        {activeSearchResults.map((hit) => (
                          <button
                            key={hit.id}
                            onClick={() => {
                               if (onSearchResultClick) onSearchResultClick(hit);
                               if (activeMap) activeMap.flyTo([hit.lat, hit.lng], 15);
                            }}
                            className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/50 hover:bg-primary/10 transition-all shrink-0 active:scale-95 group max-w-[280px] min-w-[200px] shadow-sm overflow-hidden"
                          >
                            {hit.image && (
                              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10">
                                <img src={hit.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                 <span className="text-xs leading-none shrink-0 group-hover:scale-110 transition-transform">📍</span>
                                <span className="text-[11px] font-bold text-neutral-300 group-hover:text-white truncate">{hit.name}</span>
                              </div>
                              {hit.description && (
                                <p className="text-[9px] text-neutral-500 line-clamp-2 mt-1 font-medium">{hit.description}</p>
                              )}
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Top Places Suggestions - Always show if Discovery is ON */}
                {showDiscovery && (
                  <div className="space-y-4 min-w-0">
                    <div className="h-px bg-white/5 mx-1" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Discovery</span>
                      </div>
                      
                      {/* Category Switcher */}
                      <div className="flex gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 self-start sm:self-auto overflow-x-auto no-scrollbar max-w-full shadow-inner">
                        {DISCOVERY_CATEGORIES.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setDiscoveryCategory(cat.id);
                              if (activeMap) fetchTopPlaces(activeMap.getCenter(), cat.id);
                            }}
                            className={`min-w-[32px] h-8 rounded-lg flex items-center justify-center transition-all ${
                              discoveryCategory === cat.id 
                                ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.3)]' 
                                : 'text-neutral-500 hover:text-white hover:bg-white/5'
                            }`}
                            title={cat.label}
                          >
                            <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="min-h-0">
                      {discoveries.length > 0 ? (
                        <div className="flex gap-2.5 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 min-w-0 w-full max-w-full touch-pan-x">
                          {discoveries.map((place) => (
                            <button
                              key={place.id}
                              onClick={() => onSearchResultClick?.(place)}
                              className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-amber-400/50 hover:bg-amber-400/10 transition-all shrink-0 active:scale-95 group max-w-[220px] min-w-[140px] shadow-sm"
                            >
                              <span className="text-sm leading-none shrink-0 group-hover:scale-110 transition-transform">{(place as any).emoji || '📍'}</span>
                              <span className="text-[11px] font-bold text-neutral-300 group-hover:text-white truncate">{place.name}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 flex flex-col items-center justify-center gap-2 bg-white/5 rounded-2xl border border-dashed border-white/10 group">
                          <span className="material-symbols-outlined text-neutral-600 text-lg group-hover:text-amber-400/50 transition-colors">explore</span>
                          <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest text-center">
                            Move map to find {discoveryCategory} nearby
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Trip Places Shortcut List - Always Visible if places exist */}
                {validPlaces.length > 0 && (
                  <div className="space-y-3 min-w-0">
                    <div className="h-px bg-white/5 mx-1" />
                    <div className="flex items-center gap-2 px-1">
                       <span className="material-symbols-outlined text-neutral-500 text-[14px]">map</span>
                       <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest text-[9px]">Your Itinerary</span>
                    </div>
                    <div className="flex gap-2.5 overflow-x-auto pb-4 no-scrollbar -mx-1 px-1 min-w-0">
                      {validPlaces.sort((a, b) => (a.day || 0) - (b.day || 0)).map((place) => (
                        <button
                          key={place.id}
                          onClick={() => handleMarkerClick(place)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all shrink-0 active:scale-95 ${
                            place.id === focusedPlaceId
                              ? 'bg-primary/20 border-primary shadow-lg shadow-primary/10'
                              : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-lg leading-none shrink-0">{place.emoji || emoji}</span>
                          <div className="text-left min-w-[80px]">
                            <p className="text-[10px] font-black text-white truncate leading-none mb-0.5">{place.name}</p>
                            <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-tighter">Day {place.day || 1}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    )
}
