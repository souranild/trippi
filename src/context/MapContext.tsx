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
  onViewportChange?: (center: { lat: number, lng: number }, zoom: number, bounds?: any) => void
  isPreview?: boolean
  previewCoords?: { lat: number, lng: number } | null
  isGlobal?: boolean
  showControls?: boolean
  onAddDiscovery?: (discovery: any) => void
  focusedTransportId?: string | null
  selectedDiscovery?: any | null
  setSelectedDiscovery?: React.Dispatch<React.SetStateAction<any | null>>
  isDiscoveryDetailModalOpen?: boolean
  setIsDiscoveryDetailModalOpen?: React.Dispatch<React.SetStateAction<boolean>>
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
  setDiscoveries: React.Dispatch<React.SetStateAction<any[]>>
  selectedDiscovery: any | null
  setSelectedDiscovery: React.Dispatch<React.SetStateAction<any | null>>
  isDiscoveryDetailModalOpen: boolean
  setIsDiscoveryDetailModalOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const MapContext = createContext<MapContextType | undefined>(undefined)

export function MapProvider({ children }: { children: ReactNode }) {
  const [mapState, setMapState] = useState<MapState | null>(null)
  const [isMapVisible, setIsMapVisible] = useState(false)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [discoveries, setDiscoveries] = useState<any[]>([])
  const [selectedDiscovery, setSelectedDiscovery] = useState<any | null>(null)
  const [isDiscoveryDetailModalOpen, setIsDiscoveryDetailModalOpen] = useState(false)

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
    setDiscoveries,
    selectedDiscovery,
    setSelectedDiscovery,
    isDiscoveryDetailModalOpen,
    setIsDiscoveryDetailModalOpen
  }), [mapState, isMapVisible, portalTarget, isExpanded, discoveries, selectedDiscovery, isDiscoveryDetailModalOpen]);

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
