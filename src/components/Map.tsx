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

interface Place {
  id: string
  name: string
  location: string
  lat?: number
  lng?: number
  day?: number
  emoji?: string
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

export default function TripMap({ places, emoji = '📍', className, focusedPlaceId, showDayNumbers = true, previewCoords, onClick }: MapProps) {
  return (
    <DynamicMap
      places={places}
      emoji={emoji}
      className={className}
      focusedPlaceId={focusedPlaceId}
      showDayNumbers={showDayNumbers}
      previewCoords={previewCoords}
      onClick={onClick}
    />
  )
}
