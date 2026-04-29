'use client'

import React, { useEffect, useMemo } from 'react'
import { useMapContext } from '@/context/MapContext'
import { Place } from '@/types'

interface MapSlotProps {
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
  className?: string
  showControls?: boolean
  isModal?: boolean
  onAddDiscovery?: (discovery: any) => void
  onDiscoveriesLoaded?: (discoveries: any[]) => void
}

export default function MapSlot(props: MapSlotProps) {
  const { setMapState, setIsMapVisible, setPortalTarget, isExpanded, portalTarget } = useMapContext()
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Memoize properties that affect map state to avoid unnecessary updates
  const placesKey = JSON.stringify(props.places)
  const searchResultsKey = JSON.stringify(props.searchResults)

  // logic to determine whether this specific slot should be holding the map
  const shouldBeActive = useMemo(() => {
    if (props.isModal) return isExpanded;
    return !isExpanded;
  }, [props.isModal, isExpanded]);

  const currentMapState = useMemo(() => ({
    places: props.places,
    emoji: props.emoji,
    focusedPlaceId: props.focusedPlaceId,
    showDayNumbers: props.showDayNumbers,
    mapStyle: props.mapStyle,
    searchResults: props.searchResults,
    selectedSearchResultId: props.selectedSearchResultId,
    onSearchResultClick: props.onSearchResultClick,
    onMarkerClick: props.onMarkerClick,
    onMapClick: props.onMapClick,
    onStyleChange: props.onStyleChange,
    onViewportChange: props.onViewportChange,
    isPreview: props.isPreview,
    previewCoords: props.previewCoords,
    isGlobal: props.isGlobal,
    showControls: props.showControls,
    onAddDiscovery: props.onAddDiscovery,
    onDiscoveriesLoaded: props.onDiscoveriesLoaded
  }), [
    placesKey,
    searchResultsKey,
    props.emoji,
    props.focusedPlaceId,
    props.showDayNumbers,
    props.mapStyle,
    props.selectedSearchResultId,
    props.onSearchResultClick,
    props.onMarkerClick,
    props.onMapClick,
    props.onStyleChange,
    props.onViewportChange,
    props.isPreview,
    props.previewCoords,
    props.isGlobal,
    props.showControls,
    props.onAddDiscovery,
    props.onDiscoveriesLoaded
  ]);

  const lastStateRef = React.useRef<string>('')

  // 1. Claim the portal target if not already held
  useEffect(() => {
    if (shouldBeActive && containerRef.current && portalTarget !== containerRef.current) {
      setPortalTarget(containerRef.current);
    }
  }, [shouldBeActive, portalTarget, setPortalTarget]);

  // 2. Clear portal target only on unmount
  useEffect(() => {
    return () => {
      setPortalTarget(prev => prev === containerRef.current ? null : prev);
    }
  }, [setPortalTarget]);

  // 3. Update map state when active
  useEffect(() => {
    if (!shouldBeActive) return;

    const stateString = JSON.stringify({
      ...currentMapState,
      onSearchResultClick: !!currentMapState.onSearchResultClick,
      onMarkerClick: !!currentMapState.onMarkerClick,
      onMapClick: !!currentMapState.onMapClick,
      onStyleChange: !!currentMapState.onStyleChange,
      onViewportChange: !!currentMapState.onViewportChange,
      onAddDiscovery: !!currentMapState.onAddDiscovery,
      onDiscoveriesLoaded: !!currentMapState.onDiscoveriesLoaded
    })

    if (stateString !== lastStateRef.current) { console.log("MAP_STATE_CHANGE", stateString);
      setMapState(currentMapState);
      lastStateRef.current = stateString;
    }

    setIsMapVisible(true);
  }, [shouldBeActive, currentMapState, setMapState, setIsMapVisible]);

  return (
    <div 
      ref={containerRef}
      id="map-persistent-slot" 
      className={`${props.className} relative overflow-hidden`}
    >
      <div className="absolute inset-0 bg-neutral-900 animate-pulse flex items-center justify-center -z-10">
        <span className="material-symbols-outlined text-4xl text-neutral-800">map</span>
      </div>
    </div>
  )
}
