'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  ModalBackdrop,
  ModalContainer,
  ModalHeader,
  ModalContent,
  ModalFooter
} from '@/components/ModalLayout'
import TripMap from '@/components/Map'
import { parseGoogleMapsUrl, searchLocations, getIconForType } from '@/lib/discovery'
import { Button } from '@/components/Button'
import { FormLabel, FormInput, FormTextarea } from '@/components/FormLayout'

interface LocationPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (location: { 
    name: string; 
    originalName?: string;
    address: string; 
    lat: number; 
    lng: number; 
    type?: string;
    description?: string;
    images?: string[];
  }) => void
  initialValue?: string
  initialOriginalName?: string
  initialAddress?: string
  initialLat?: number
  initialLng?: number
  mapStyle?: string
}

export default function LocationPickerModal({
  isOpen,
  onClose,
  onSelect,
  initialValue = '',
  initialOriginalName = '',
  initialAddress = '',
  initialLat,
  initialLng,
  mapStyle
}: LocationPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [googleUrl, setGoogleUrl] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Edited fields
  const [placeName, setPlaceName] = useState(initialOriginalName || initialValue)
  const [address, setAddress] = useState(initialAddress)
  const [lat, setLat] = useState<number | undefined>(initialLat)
  const [lng, setLng] = useState<number | undefined>(initialLng)
  const [type, setType] = useState<string | undefined>('landmark')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<string[]>([])

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Reset state when opening with new initial values
  useEffect(() => {
    if (isOpen) {
      setPlaceName(initialOriginalName || initialValue)
      setAddress(initialAddress)
      setLat(initialLat)
      setLng(initialLng)
      setSearchQuery('')
      setGoogleUrl('')
    }
  }, [isOpen, initialValue, initialOriginalName, initialAddress, initialLat, initialLng])

  // Handle live search
  useEffect(() => {
    if (!isOpen) return
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    
    if (searchQuery.length < 3) {
      setSearchResults([])
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      const results = await searchLocations(searchQuery)
      setSearchResults(results.map(r => ({
        id: r.id,
        name: r.name,
        address: r.tags?.['addr:full'] || r.tags?.['addr:city'] || `${r.lat.toFixed(3)}, ${r.lng.toFixed(3)}`,
        lat: r.lat,
        lng: r.lng,
        type: r.type,
        image: r.image,
        description: r.description,
        images: r.images || (r.image ? [r.image] : [])
      })))
      setIsSearching(false)
    }, 500)

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [searchQuery, isOpen])

  // Handle Google URL parsing
  const handleUrlChange = async (url: string) => {
    setGoogleUrl(url)
    const parsed = parseGoogleMapsUrl(url)
    if (parsed) {
      if (parsed.lat && parsed.lng) {
        setLat(parsed.lat)
        setLng(parsed.lng)
        setPlaceName(parsed.name || 'Pinned Location')
        setAddress(parsed.address || url)
        
        if (parsed.name) {
          setIsSearching(true)
          const results = await searchLocations(parsed.name, parsed.lat, parsed.lng)
          if (results.length > 0) {
            const best = results[0]
            setDescription(best.description || '')
            setImages(best.images || (best.image ? [best.image] : []))
            setType(best.type)
          }
          setIsSearching(false)
        }
      }
    }
  }

  const handleSelectResult = (result: any) => {
    setLat(result.lat)
    setLng(result.lng)
    setPlaceName(result.name)
    setAddress(result.address)
    setDescription(result.description || '')
    setImages(result.images || (result.image ? [result.image] : []))
    setType(result.type)
    setSearchResults([])
    setSearchQuery('')
  }

  if (!isOpen) return null

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalContainer size="lg" className="h-[85vh] max-h-[800px]">
        <ModalHeader
          title="Pick Location"
          subtitle="Search, paste a link, or manually adjust details"
          onClose={onClose}
          icon="location_on"
          iconColor="text-primary"
        />

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left Column - Search & Forms */}
          <div className="w-full md:w-1/2 flex flex-col overflow-y-auto custom-scrollbar border-r border-white/10 bg-white/[0.02]">
            <div className="p-5 space-y-6">
              {/* Search Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <FormLabel>Search Location</FormLabel>
                  <div className="relative group">
                    <FormInput
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search city, landmark, or address..."
                      className="pl-11"
                    />
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-lg group-focus-within:text-primary transition-colors">search</span>
                    {isSearching && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-1 animate-in fade-in slide-in-from-top-2 border border-white/10 rounded-2xl bg-black/20 p-1">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleSelectResult(result)}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-primary/10 transition-all group flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <span className="material-symbols-outlined text-neutral-500 group-hover:text-primary text-lg">
                            {result.type === 'city' ? 'location_city' : getIconForType(result.type)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white group-hover:text-primary transition-colors truncate">{result.name}</p>
                          <p className="text-[10px] text-neutral-500 truncate">{result.address}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/5"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] font-bold text-neutral-600">
                    <span className="bg-[#121212] px-3">or paste link</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <FormLabel>Google Maps URL</FormLabel>
                  <div className="relative group">
                    <FormInput
                      value={googleUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="https://www.google.com/maps/..."
                      className="pl-11"
                    />
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-lg group-focus-within:text-primary transition-colors">link</span>
                  </div>
                </div>
              </div>

              {/* Editable Fields Section */}
              <div className="pt-4 border-t border-white/10 space-y-4 animate-in fade-in duration-500">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(34,211,238,0.5)]"></span>
                  <h4 className="text-xs font-bold text-primary">Refine Details</h4>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <FormLabel variant="secondary">Name</FormLabel>
                    <FormInput 
                      value={placeName}
                      onChange={(e) => setPlaceName(e.target.value)}
                      placeholder="Name of the place"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <FormLabel variant="secondary">Address</FormLabel>
                    <FormTextarea 
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Full address"
                      rows={2}
                    />
                  </div>
                </div>

                {lat && lng && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-neutral-600">Latitude</span>
                        <span className="text-[10px] font-mono text-neutral-400">{lat.toFixed(6)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-neutral-600">Longitude</span>
                        <span className="text-[10px] font-mono text-neutral-400">{lng.toFixed(6)}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-neutral-500 bg-white/5 px-2 py-1 rounded-md border border-white/10">
                      {type || 'landmark'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Map Preview */}
          <div className="hidden md:block flex-1 bg-neutral-900 relative">
            <TripMap
              places={[]}
              previewCoords={lat && lng ? { lat, lng } : null}
              className="h-full w-full"
              showDayNumbers={false}
              showControls={true}
              mapStyle={mapStyle}
            />
            
            {!lat && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-[50]">
                <div className="text-center p-8 bg-neutral-900/80 border border-white/10 rounded-[2.5rem] backdrop-blur-xl max-w-xs shadow-2xl">
                  <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-4xl text-neutral-600">map</span>
                  </div>
                  <p className="text-sm font-bold text-white">Select a location to preview</p>
                  <p className="text-xs text-neutral-500 mt-2 leading-relaxed">The map will center here once you search or pick a point</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <ModalFooter className="flex justify-between items-center bg-black/40 backdrop-blur-md">
          <Button
            variant="ghost"
            onClick={onClose}
            className="px-6 border-none hover:bg-white/5"
          >
            Cancel
          </Button>
          
          <Button
            variant="modal-primary"
            disabled={!lat || !lng || !placeName}
            onClick={() => lat && lng && onSelect({
              name: placeName,
              originalName: placeName,
              address: address,
              lat: lat,
              lng: lng,
              type: type,
              description: description,
              images: images
            })}
            icon="check_circle"
          >
            Select Location
          </Button>
        </ModalFooter>
      </ModalContainer>
    </ModalBackdrop>
  )
}
