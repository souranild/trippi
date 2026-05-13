'use client'

import React, { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useMapContext } from '@/context/MapContext'
import { createPortal } from 'react-dom'

const MapClient = dynamic(() => import('../MapClient'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-neutral-900 animate-pulse flex items-center justify-center">
    <span className="material-symbols-outlined text-4xl text-neutral-700">map</span>
  </div>
})

export default function PersistentMapHost() {
  const { mapState, isMapVisible, portalTarget } = useMapContext()

  // We render the map once, and portal it to the slot defined in the page
  // We use a stable reference to the MapClient so it never re-mounts its MapContainer
  const mapElement = React.useMemo(() => {
    return (
      <MapClient 
        className="w-full h-full"
      />
    )
  }, [])

  if (!isMapVisible || !mapState || !mapElement) return null

  if (!portalTarget) {
    // If no slot is found but map should be visible, we keep it "warmed up" hidden
    return (
      <div className="fixed -left-[9999px] -top-[9999px] w-[600px] h-[600px] pointer-events-none opacity-0">
        {mapElement}
      </div>
    )
  }

  return createPortal(mapElement, portalTarget)
}
