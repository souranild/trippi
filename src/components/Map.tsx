'use client'

import dynamic from 'next/dynamic'

// Dynamically import the map component to avoid SSR issues
const DynamicMap = dynamic(() => import('./MapClient'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full bg-neutral-900 rounded-xl overflow-hidden relative flex items-center justify-center">
      <div className="text-neutral-400">Loading map...</div>
    </div>
  )
})

import type { Place as StoragePlace, Transport } from '@/lib/storage'

interface Place extends StoragePlace {}

interface MapProps {
  places: Place[]
  emoji?: string
  className?: string
  focusedPlaceId?: string | null
  showDayNumbers?: boolean
  previewCoords?: { lat: number, lng: number } | null
  onMapClick?: (coords: { lat: number, lng: number }) => void
  onMarkerClick?: (place: Place) => void
  searchResults?: any[]
  selectedSearchResultId?: string | null
  onSearchResultClick?: (hit: any) => void
  onViewportChange?: (center: { lat: number, lng: number }, zoom: number) => void
  mapStyle?: string
  onStyleChange?: (style: string) => void
  showControls?: boolean
}

export default function TripMap({ places, emoji = '📍', className, focusedPlaceId, showDayNumbers = true, previewCoords, onMapClick, onMarkerClick, searchResults, selectedSearchResultId, onSearchResultClick, onViewportChange, mapStyle, onStyleChange, showControls = false }: MapProps) {
  return (
    <DynamicMap
      places={places}
      emoji={emoji}
      className={className}
      focusedPlaceId={focusedPlaceId}
      showDayNumbers={showDayNumbers}
      previewCoords={previewCoords}
      onMapClick={onMapClick}
      onMarkerClick={onMarkerClick}
      searchResults={searchResults}
      selectedSearchResultId={selectedSearchResultId}
      onSearchResultClick={onSearchResultClick}
      onViewportChange={onViewportChange}
      mapStyle={mapStyle}
      onStyleChange={onStyleChange}
      showControls={showControls}
    />
  )
}
