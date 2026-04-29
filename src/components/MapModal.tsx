'use client'

import { useState } from 'react'
import Map from './Map'
import { Place } from '@/lib/storage'

interface MapModalProps {
  isOpen: boolean
  onClose: () => void
  onAddPlace: (place: Place) => void
}

export default function MapModal({ isOpen, onClose, onAddPlace }: MapModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Place[]>([])
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)

  const handleSearch = async () => {
    // Use existing place search logic
    // setSearchResults
  }

  const handleAddPlace = () => {
    if (selectedPlace) {
      onAddPlace(selectedPlace)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="w-full h-full max-w-6xl max-h-screen bg-neutral-900 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for places..."
            className="w-full p-2 bg-white/10 rounded"
          />
          <button onClick={handleSearch} className="mt-2 px-4 py-2 bg-primary rounded">Search</button>
        </div>
        <div className="flex h-full">
          <div className="w-1/3 p-4 overflow-y-auto">
            {searchResults.map((place) => (
              <div key={place.id} onClick={() => setSelectedPlace(place)} className="p-2 cursor-pointer hover:bg-white/10">
                {place.name}
              </div>
            ))}
          </div>
          <div className="w-2/3">
            <Map places={selectedPlace ? [selectedPlace] : []} />
          </div>
        </div>
        <div className="p-4 border-t border-white/10 flex justify-between">
          <button onClick={onClose} className="px-4 py-2 bg-neutral-700 rounded">Cancel</button>
          <button onClick={handleAddPlace} className="px-4 py-2 bg-primary rounded" disabled={!selectedPlace}>Add Place</button>
        </div>
      </div>
    </div>
  )
}