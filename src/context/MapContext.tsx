'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Place } from '@/lib/storage'

interface MapState {
  places: Place[]
  emoji?: string
  focusedPlaceId?: string | null
  showDayNumbers?: boolean
  mapStyle?: string
  searchResults?: any[]
  selectedSearchResultId?: string | null
  onSearchResultClick?: (place: any) => void
  onMarkerClick?: (place: Place) => void
  onMapClick?: (coords: { lat: number, lng: number }) => void
  onStyleChange?: (style: string) => void
  onViewportChange?: (viewport: any) => void
  isPreview?: boolean
  previewCoords?: { lat: number, lng: number } | null
  isGlobal?: boolean
  showControls?: boolean
  onAddDiscovery?: (discovery: any) => void
}

interface MapContextType {
  mapState: MapState | null
  setMapState: (state: MapState | null) => void
  isMapVisible: boolean
  setIsMapVisible: (visible: boolean) => void
  portalTarget: HTMLElement | null
  setPortalTarget: React.Dispatch<React.SetStateAction<HTMLElement | null>>
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
  discoveries: any[]
  setDiscoveries: (discoveries: any[]) => void
}

const MapContext = createContext<MapContextType | undefined>(undefined)

export function MapProvider({ children }: { children: ReactNode }) {
  const [mapState, setMapState] = useState<MapState | null>(null)
  const [isMapVisible, setIsMapVisible] = useState(false)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [discoveries, setDiscoveries] = useState<any[]>([])

  const value = React.useMemo(() => ({ 
    mapState, 
    setMapState, 
    isMapVisible, 
    setIsMapVisible,
    portalTarget,
    setPortalTarget,
    isExpanded,
    setIsExpanded,
    discoveries,
    setDiscoveries
  }), [mapState, isMapVisible, portalTarget, isExpanded, discoveries]);

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const context = useContext(MapContext)
  if (context === undefined) {
    throw new Error('useMapContext must be used within a MapProvider')
  }
  return context
}
