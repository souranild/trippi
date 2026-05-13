'use client'

import React, { useEffect, useMemo } from 'react'
import { useMapContext } from '@/context/MapContext'
import { Place } from '@/lib/storage'

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
  onViewportChange?: (center: { lat: number, lng: number }, zoom: number, bounds?: any) => void
  isPreview?: boolean
  previewCoords?: { lat: number, lng: number } | null
  isGlobal?: boolean
  className?: string
  showControls?: boolean
  isModal?: boolean
  onAddDiscovery?: (discovery: any) => void
  onDiscoveriesLoaded?: (discoveries: any[]) => void
  focusedTransportId?: string | null
  livePlaceId?: string | null
  liveTransportId?: string | null
  onOpenTransport?: (transport: any, fromName: string, toName: string) => void
  isActiveOverride?: boolean
}

export default function MapSlot(props: MapSlotProps) {
  const { setMapState, setIsMapVisible, setPortalTarget, isExpanded, portalTarget } = useMapContext()
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Use a stable key for places and search results to avoid expensive stringification on every render
  const placesKey = useMemo(() => props.places.map(p => p.id).join(','), [props.places])
  const searchResultsKey = useMemo(() => (props.searchResults?.length || 0).toString(), [props.searchResults])

  // logic to determine whether this specific slot should be holding the map
  const shouldBeActive = useMemo(() => {
    if (props.isActiveOverride !== undefined) return props.isActiveOverride;
    if (props.isModal) return isExpanded;
    return !isExpanded;
  }, [props.isModal, isExpanded, props.isActiveOverride]);

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
    onDiscoveriesLoaded: props.onDiscoveriesLoaded,
    focusedTransportId: props.focusedTransportId,
    livePlaceId: props.livePlaceId,
    liveTransportId: props.liveTransportId,
    onOpenTransport: props.onOpenTransport
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
    props.onDiscoveriesLoaded,
    props.focusedTransportId,
    props.livePlaceId,
    props.liveTransportId,
    props.onOpenTransport
  ]);

  const lastStateRef = React.useRef<string>('')

  // 1. Claim the portal target if not already held
  useEffect(() => {
    if (shouldBeActive && containerRef.current && portalTarget !== containerRef.current) {
      setPortalTarget(containerRef.current);
    } else if (!shouldBeActive && portalTarget === containerRef.current) {
      setPortalTarget(null);
    }
  }, [shouldBeActive, portalTarget, setPortalTarget]);

  // 2. Clear portal target only on unmount
  useEffect(() => {
    return () => {
      setPortalTarget((prev: any) => prev === containerRef.current ? null : prev);
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
      onDiscoveriesLoaded: !!currentMapState.onDiscoveriesLoaded,
      onOpenTransport: !!currentMapState.onOpenTransport
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
