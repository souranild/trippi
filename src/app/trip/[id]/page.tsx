'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Trip, loadTrips, updateTrip, updatePlace, removePlace, Document, Link as PlaceLink } from '@/lib/storage'
import { useTrips } from '@/context/TripContext'
import { searchWallpapers, getRandomPlaceholder } from '@/lib/wallpaper-search'
import TripForm from '@/components/TripForm'
import TimePicker from '@/components/TimePicker'
import PlaceForm from '@/components/PlaceForm'
import type { Event as TripEvent, Accommodation, Place, Transport, TransportMode } from '@/lib/storage'
import type { PlaceSearchHit } from '@/lib/places-search'
import {
  TRANSPORT_MODES,
  normalizeTransportMode,
  transportModeIcon,
  transportModeLabel,
} from '@/lib/transport-options'

const emojis = [
  '✈️', '🏖️', '🏔️', '🏙️', '🌴', '🏰', '🗽', '🗼', '🎭', '🍜', '🏃', '🎨', '🎵', '🍷', '🏂', '🚀',
  '🌍', '🏕️', '🏝️', '🌄', '🌅', '🏞️', '🏜️', '🏯', '🕌', '⛩️', '🏛️', '🎡', '🎢', '🎠', '🏟️', '🎪',
  '🍕', '🍔', '🍟', '🌭', '🍿', '🍩', '🍪', '🎂', '🍰', '🧁', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼',
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🏏', '⛳', '🏹',
  '🎸', '🎹', '🥁', '🎷', '🎺', '🪕', '🎻', '🎤', '🎧', '🎼', '🎶', '🎙️', '🎚️', '🎛️', '🎯',
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲',
  '⛵', '🛶', '🚤', '🛳️', '⛴️', '🚢', '🛩️', '🛫', '🛬', '🚁', '🚟', '🚠', '🚡', '🛤️', '🛸'
]

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full bg-neutral-900 animate-pulse rounded-xl" />,
})

export default function TripDetail() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { updateTrip: updateTripContext } = useTrips()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [isPlaceSearchOpen, setIsPlaceSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PlaceSearchHit[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [placeInputMode, setPlaceInputMode] = useState<'search' | 'manual'>('search')
  const [selectedSearchResult, setSelectedSearchResult] = useState<PlaceSearchHit | null>(null)
  const searchAbortRef = useRef<AbortController | null>(null)
  const [manualPlaceName, setManualPlaceName] = useState('')
  const [manualPlaceLocation, setManualPlaceLocation] = useState('')
  const [manualPlaceCountry, setManualPlaceCountry] = useState('')
  const [newPlaceArrival, setNewPlaceArrival] = useState('')
  const [newPlaceDeparture, setNewPlaceDeparture] = useState('')
  const [newPlaceDay, setNewPlaceDay] = useState<number>(1)
  const [newPlaceNotes, setNewPlaceNotes] = useState('')
  const [newPlaceDocuments, setNewPlaceDocuments] = useState<Document[]>([])
  const [newPlaceLinks, setNewPlaceLinks] = useState<PlaceLink[]>([])
  const [newPlaceEvents, setNewPlaceEvents] = useState<TripEvent[]>([])
  const [mapsUrlInput, setMapsUrlInput] = useState('')
  const [mapPreviewCoords, setMapPreviewCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [mobileStep, setMobileStep] = useState<1 | 2>(1)
  const [transportBetweenIndex, setTransportBetweenIndex] = useState<number | null>(null)
  const [transportToPlaceId, setTransportToPlaceId] = useState<string | null>(null)
  const [isTransportModalOpen, setIsTransportModalOpen] = useState(false)
  const [selectedTransportMode, setSelectedTransportMode] = useState<TransportMode | null>(null)
  const [transportLegDeparture, setTransportLegDeparture] = useState('')
  const [transportLegArrival, setTransportLegArrival] = useState('')
  const [transportLegDuration, setTransportLegDuration] = useState('')
  const [editingTransportLegId, setEditingTransportLegId] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)
  const [wallpaperOpacity, setWallpaperOpacity] = useState(1)
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null)

  // Track state of nested pickers in TripForm to manage the global back button
  const [isEmojiPickerInForm, setIsEmojiPickerInForm] = useState(false)
  const [isWallpaperPickerInForm, setIsWallpaperPickerInForm] = useState(false)

  // Calculate all days in the trip
  const getAllDaysInTrip = () => {
    if (!trip?.startDate) return []
    
    const startDate = new Date(trip.startDate)
    const endDate = trip.endDate ? new Date(trip.endDate) : new Date(trip.startDate)
    
    const days = []
    const currentDate = new Date(startDate)
    let dayNumber = 1
    
    while (currentDate <= endDate) {
      days.push({
        dayNumber,
        date: new Date(currentDate),
        formattedDate: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' }).toUpperCase(),
        places: places.filter(place => place.day === dayNumber || (dayNumber === 1 && !place.day))
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
      dayNumber++
    }
    
    return days
  }

  const allDays = getAllDaysInTrip()

  // Helper function to migrate places to ensure they have required arrays
  const migratePlaces = (places: Place[]): Place[] => {
    return places.map(place => ({
      ...place,
      events: place.events || [],
      documents: place.documents || [],
      links: place.links || []
    }))
  }
  const openEditModal = () => {
    if (!trip) return
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = (data: {
    emoji: string
    title: string
    description: string
    startDate: string
    endDate: string
    wallpaper: string
  }) => {
    if (!trip) return

    setIsEditSubmitting(true)

    const updatedTrip = {
      ...trip,
      title: data.title,
      description: data.description,
      emoji: data.emoji,
      startDate: data.startDate,
      endDate: data.endDate,
      wallpaper: data.wallpaper
    }

    // Update context and storage
    updateTripContext(updatedTrip)
    
    // Update local state
    setTrip(updatedTrip)
    setIsEditModalOpen(false)
    setIsEditSubmitting(false)
  }

  const searchEditWallpapers = async (query: string) => {
    // Dummy function - TripForm handles wallpaper search internally
  }


  const deleteTransportLeg = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!editingTransportLegId || !trip) return
    if (confirm('Delete this transport leg?')) {
      const updatedPlaces = [...places]
      if (transportBetweenIndex === -1) {
        // From home - stored in first place
        if (updatedPlaces[0]) {
          updatedPlaces[0] = {
            ...updatedPlaces[0],
            transport: updatedPlaces[0].transport?.filter(t => t.id !== editingTransportLegId)
          }
        }
      } else if (transportBetweenIndex !== null && updatedPlaces[transportBetweenIndex]) {
        updatedPlaces[transportBetweenIndex] = {
          ...updatedPlaces[transportBetweenIndex],
          transport: updatedPlaces[transportBetweenIndex].transport?.filter(t => t.id !== editingTransportLegId)
        }
      }
      setPlaces(updatedPlaces)
      savePlacesToTrip(updatedPlaces)
      closeTransportModal()
    }
  }

  const [mapError, setMapError] = useState(false)
  const [editingPlace, setEditingPlace] = useState<Place | null>(null)
  const [isPlaceDetailModalOpen, setIsPlaceDetailModalOpen] = useState(false)
  const [placeModalMode, setPlaceModalMode] = useState<'add' | 'edit'>('add')
  const [selectedPlaceForDetail, setSelectedPlaceForDetail] = useState<Place | null>(null)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [eventPlaceId, setEventPlaceId] = useState<string>('')
  const [eventTitle, setEventTitle] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')

  useEffect(() => {
    if (!isPlaceSearchOpen) return

    const q = searchQuery.trim()
    if (q.length < 2) {
      setSearchResults([])
      setSearchError(null)
      setIsSearching(false)
      return
    }

    const timer = window.setTimeout(() => {
      searchAbortRef.current?.abort()
      const ac = new AbortController()
      searchAbortRef.current = ac
      setIsSearching(true)
      setSearchError(null)

      fetch(`/api/places/search?q=${encodeURIComponent(q)}`, { signal: ac.signal })
        .then(async (res) => {
          const data = (await res.json()) as { results?: PlaceSearchHit[]; error?: string }
          setSearchResults(data.results ?? [])
          setSearchError(
            data.error ??
              (res.ok ? null : 'Search request failed. Try again or add a place manually.'),
          )
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return
          if (err instanceof Error && err.name === 'AbortError') return
          setSearchResults([])
          setSearchError('Could not reach the app. Check your connection and try again.')
        })
        .finally(() => {
          if (!ac.signal.aborted) setIsSearching(false)
        })
    }, 400)

    return () => {
      clearTimeout(timer)
      searchAbortRef.current?.abort()
    }
  }, [searchQuery, isPlaceSearchOpen])

  const getMapUrl = () => {
    if (places.length === 0) return 'https://maps.google.com/maps?q=popular+destinations&output=embed&style=feature:poi|visibility:off&style=feature:transit|visibility:off&style=feature:road|visibility:simplified&style=element:labels|visibility:off&style=feature:administrative|visibility:off&style=feature:landscape|element:geometry|color:0x1a1a1a&style=feature:water|element:geometry|color:0x0e0e0e&style=feature:road|element:geometry|color:0x2d2d2d'

    if (places.length === 1) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(places[0].name + ', ' + places[0].location)}&output=embed&style=feature:poi|visibility:off&style=feature:transit|visibility:off&style=feature:road|visibility:simplified&style=element:labels|visibility:off&style=feature:administrative|visibility:off&style=feature:landscape|element:geometry|color:0x1a1a1a&style=feature:water|element:geometry|color:0x0e0e0e&style=feature:road|element:geometry|color:0x2d2d2d`
    }

    // For multiple places, create a route
    const waypoints = places.map(p => encodeURIComponent(p.name + ', ' + p.location))
    return `https://maps.google.com/maps/dir/${waypoints.join('/')}/&output=embed&style=feature:poi|visibility:off&style=feature:transit|visibility:off&style=feature:road|visibility:simplified&style=element:labels|visibility:off&style=feature:administrative|visibility:off&style=feature:landscape|element:geometry|color:0x1a1a1a&style=feature:water|element:geometry|color:0x0e0e0e&style=feature:road|element:geometry|color:0x2d2d2d`
  }

  const savePlacesToTrip = (updatedPlaces: Place[]) => {
    if (trip) {
      const updatedTrip = { ...trip, places: updatedPlaces }
      updateTripContext(updatedTrip)
      setTrip(updatedTrip)
    }
  }

  const selectPlaceFromSearch = (place: PlaceSearchHit) => {
    setSelectedSearchResult(place)
    setMapPreviewCoords({ lat: place.coordinates.lat, lng: place.coordinates.lng })
    setManualPlaceName(place.name)
    // For cities/districts, location should be the city name
    // For landmarks, location should be the city part
    const isCityOrDistrict = place.type === 'district' || place.type === 'city'
    const placeLocation = isCityOrDistrict ? place.name : (place.city || place.location.split(',')[0]?.trim() || place.name)
    setManualPlaceLocation(placeLocation)
    setManualPlaceCountry(place.country || place.location.split(',').pop()?.trim() || '')
  }

  const parseGoogleMapsUrl = (url: string) => {
    try {
      // Handle various Google Maps URL formats
      // Format 1: https://maps.google.com/maps?q=place+name
      // Format 2: https://goo.gl/maps/xxxxx
      // Format 3: https://www.google.com/maps/place/place+name/@lat,lng
      // Format 4: https://maps.google.com/?q=lat,lng
      
      const urlObj = new URL(url)
      let placeName = ''
      let coords: { lat: number; lng: number } | null = null
      
      // Try to extract from query parameter
      const q = urlObj.searchParams.get('q')
      if (q) {
        // Check if it's coordinates
        const coordsMatch = q.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/)
        if (coordsMatch) {
          coords = { lat: parseFloat(coordsMatch[1]), lng: parseFloat(coordsMatch[2]) }
        } else {
          placeName = decodeURIComponent(q).replace(/\+/g, ' ')
        }
      }
      
      // Try to extract from path (for maps.google.com/maps/place/...)
      const placeMatch = urlObj.pathname.match(/\/place\/([^/]+)/)
      if (placeMatch && !placeName) {
        placeName = decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ')
      }
      
      // Try to extract coordinates from @lat,lng format
      const pathCoords = urlObj.hash.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/) || urlObj.pathname.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
      if (pathCoords) {
        coords = { lat: parseFloat(pathCoords[1]), lng: parseFloat(pathCoords[2]) }
      }
      
      if (placeName) {
        setManualPlaceName(placeName)
        setManualPlaceLocation(placeName)
      }
      
      if (coords) {
        setMapPreviewCoords(coords)
      }
      
      setMapsUrlInput('')
      return true
    } catch (error) {
      console.error('Failed to parse Google Maps URL:', error)
      return false
    }
  }

  const addPlace = () => {
    if (selectedSearchResult || (manualPlaceName.trim() && manualPlaceLocation.trim() && manualPlaceCountry.trim())) {
      const isSearch = !!selectedSearchResult;
      const country = isSearch 
        ? (selectedSearchResult!.country?.trim() || selectedSearchResult!.location.split(',').pop()?.trim() || 'Unknown')
        : manualPlaceCountry;
      
      const isCityOrDistrict = isSearch && (selectedSearchResult!.type === 'district' || selectedSearchResult!.type === 'city');
      const location = isSearch 
        ? (isCityOrDistrict ? selectedSearchResult!.name : selectedSearchResult!.location)
        : manualPlaceLocation;

      const newPlace: Place = {
        id: placeModalMode === 'edit' && editingPlace ? editingPlace.id : Date.now().toString(),
        name: isSearch ? selectedSearchResult!.name : manualPlaceName,
        location,
        country,
        lat: isSearch ? selectedSearchResult!.coordinates.lat : (mapPreviewCoords ? mapPreviewCoords.lat : (placeModalMode === 'edit' && editingPlace?.lat ? editingPlace.lat : 0)),
        lng: isSearch ? selectedSearchResult!.coordinates.lng : (mapPreviewCoords ? mapPreviewCoords.lng : (placeModalMode === 'edit' && editingPlace?.lng ? editingPlace.lng : 0)),
        day: newPlaceDay,
        events: newPlaceEvents,
        documents: newPlaceDocuments,
        links: newPlaceLinks,
        ...(newPlaceArrival && { arrival: newPlaceArrival }),
        ...(newPlaceDeparture && { departure: newPlaceDeparture }),
        ...(newPlaceNotes && { notes: newPlaceNotes }),
      }

      if (placeModalMode === 'edit' && editingPlace) {
        if (!trip) return;
        updatePlace(trip.id, editingPlace.id, newPlace);
        const updatedTrips = loadTrips();
        const found = updatedTrips.find(t => t.id === id);
        if (found) {
          setTrip(found);
          setPlaces(migratePlaces(found.places || []));
        }
      } else {
        const updatedPlaces = [...places, newPlace];
        setPlaces(updatedPlaces);
        savePlacesToTrip(updatedPlaces);
      }
      resetPlaceModal();
    }
  }

  const resetPlaceModal = () => {
    searchAbortRef.current?.abort()
    setIsPlaceSearchOpen(false)
    setPlaceModalMode('add')
    setEditingPlace(null)
    setSearchQuery('')
    setSearchResults([])
    setSearchError(null)
    setSelectedSearchResult(null)
    setManualPlaceName('')
    setManualPlaceLocation('')
    setManualPlaceCountry('')
    setNewPlaceArrival('')
    setNewPlaceDeparture('')
    setNewPlaceDay(Math.max(1, places.length + 1))
    setNewPlaceNotes('')
    setNewPlaceDocuments([])
    setNewPlaceLinks([])
    setNewPlaceEvents([])
    setMapsUrlInput('')
    setMapPreviewCoords(null)
    setPlaceInputMode('search')
    setMobileStep(1)
  }

  const startEditingPlace = (place: Place) => {
    setPlaceModalMode('edit');
    setEditingPlace(place);
    setIsPlaceSearchOpen(true);
    setMobileStep(1); // Ensure step reset when editing
    
    // Fill form details
    setManualPlaceName(place.name);
    setManualPlaceLocation(place.location);
    setManualPlaceCountry(place.country);
    setNewPlaceArrival(place.arrival || '');
    setNewPlaceDeparture(place.departure || '');
    setNewPlaceDay(place.day || 1);
    setNewPlaceNotes(place.notes || '');
    setNewPlaceEvents(place.events || []);
    setNewPlaceDocuments(place.documents || []);
    setNewPlaceLinks(place.links || []);

    // Set up left side (search/manual)
    if (place.lat && place.lng) {
      setPlaceInputMode('search');
      setSearchQuery(place.name);
      setMapPreviewCoords({ lat: place.lat, lng: place.lng });
      // Construct a pseudo search result to show it as selected
      const pseudoSearchHit: PlaceSearchHit = {
        id: place.id,
        name: place.name,
        location: place.location,
        city: '', // Required by interface
        country: place.country,
        coordinates: { lat: place.lat, lng: place.lng },
        type: 'landmark' // default
      };
      setSelectedSearchResult(pseudoSearchHit);
    } else {
      setPlaceInputMode('manual');
      setSelectedSearchResult(null);
      setMapPreviewCoords(null);
    }
  }

  const savePlaceEdits = () => {
    // This is now handled by addPlace (unified save logic)
    addPlace();
  }

  const deletePlace = (placeId: string) => {
    if (!trip) return
    if (confirm('Are you sure you want to delete this place?')) {
      removePlace(trip.id, placeId)
      const updatedTrips = loadTrips()
      const found = updatedTrips.find(t => t.id === id)
      if (found) {
        setTrip(found)
        setPlaces(migratePlaces(found.places || []))
      }
      setIsPlaceDetailModalOpen(false)
      setSelectedPlaceForDetail(null)
      resetPlaceModal()
    }
  }

  const savePlaceDetailEdits = () => {
    if (!selectedPlaceForDetail || !trip) return

    updatePlace(trip.id, selectedPlaceForDetail.id, {
      name: selectedPlaceForDetail.name,
      location: selectedPlaceForDetail.location,
      country: selectedPlaceForDetail.country,
      arrival: selectedPlaceForDetail.arrival || undefined,
      departure: selectedPlaceForDetail.departure || undefined,
      day: selectedPlaceForDetail.day || 1,
      notes: selectedPlaceForDetail.notes || '',
      events: selectedPlaceForDetail.events || [],
      documents: selectedPlaceForDetail.documents || [],
      links: selectedPlaceForDetail.links || []
    })

    const updatedTrips = loadTrips()
    const found = updatedTrips.find(t => t.id === id)
    if (found) {
      setTrip(found)
      setPlaces(migratePlaces(found.places || []))
    }
    setIsPlaceDetailModalOpen(false)
    setSelectedPlaceForDetail(null)
  }

  const cancelPlaceEdits = () => {
    setEditingPlace(null)
  }

  const openEventModal = (placeId: string) => {
    setEventPlaceId(placeId)
    setIsEventModalOpen(true)
    // Set default date to the place's day
    const place = places.find(p => p.id === placeId)
    if (place && trip && trip.startDate) {
      const placeDate = new Date(trip.startDate)
      placeDate.setDate(placeDate.getDate() + (place.day || 1) - 1)
      setEventDate(placeDate.toISOString().split('T')[0])
    }
  }

  const saveEvent = () => {
    if (!eventTitle.trim() || !eventPlaceId) return

    const newEvent: TripEvent = {
      id: Date.now().toString(),
      title: eventTitle.trim(),
      description: eventDescription.trim(),
      date: eventDate,
      ...(eventTime && { time: eventTime }),
      type: 'activity',
      documents: []
    }

    const updatedPlaces = places.map(place => {
      if (place.id === eventPlaceId) {
        return {
          ...place,
          events: [...place.events, newEvent]
        }
      }
      return place
    })

    setPlaces(updatedPlaces)
    savePlacesToTrip(updatedPlaces)
    resetEventModal()
  }

  const resetEventModal = () => {
    setIsEventModalOpen(false)
    setEventPlaceId('')
    setEventTitle('')
    setEventDescription('')
    setEventDate('')
    setEventTime('')
  }

  const closeTransportModal = () => {
    setIsTransportModalOpen(false)
    setTransportBetweenIndex(null)
    setTransportToPlaceId(null)
    setSelectedTransportMode(null)
    setTransportLegDeparture('')
    setTransportLegArrival('')
    setTransportLegDuration('')
    setEditingTransportLegId(null)
  }

  const openTransportModal = (fromPlaceId: string, toPlaceId: string, legId?: string) => {
    const fromIdx = fromPlaceId === 'home' ? -1 : places.findIndex((p) => p.id === fromPlaceId)
    if (fromIdx < 0 && fromPlaceId !== 'home') return
    setTransportBetweenIndex(fromIdx)
    setTransportToPlaceId(toPlaceId)

    const fromPlace = fromPlaceId === 'home' ? null : places[fromIdx]
    const existing = legId ? fromPlace?.transport?.find((t) => t.id === legId) : fromPlace?.transport?.find((t) => t.to === toPlaceId)
    if (existing) {
      setEditingTransportLegId(existing.id)
      setSelectedTransportMode(normalizeTransportMode(existing.type))
      setTransportLegDeparture(existing.departure || '')
      setTransportLegArrival(existing.arrival || '')
      setTransportLegDuration(existing.duration || '')
    } else {
      setEditingTransportLegId(null)
      setSelectedTransportMode(null)
      setTransportLegDeparture('')
      setTransportLegArrival('')
      setTransportLegDuration('')
    }
    setIsTransportModalOpen(true)
  }

  const saveTransportLeg = () => {
    if (!transportToPlaceId || !selectedTransportMode) return
    let fromPlaceId = ''
    if (transportBetweenIndex === -1) {
      fromPlaceId = 'home'
    } else if (typeof transportBetweenIndex === 'number') {
      const place = places[transportBetweenIndex]
      if (!place) return
      fromPlaceId = place.id
    } else {
      return
    }
    const toPlace = transportToPlaceId === 'home' ? null : places.find((p) => p.id === transportToPlaceId)
    if (transportToPlaceId !== 'home' && !toPlace) return

    const leg: Transport = {
      id: editingTransportLegId ?? Date.now().toString(),
      type: selectedTransportMode,
      from: fromPlaceId,
      to: transportToPlaceId,
      departure: transportLegDeparture,
      arrival: transportLegArrival,
      ...(transportLegDuration.trim() && { duration: transportLegDuration.trim() }),
      documents: editingTransportLegId ? (fromPlaceId === 'home' ? [] : (transportBetweenIndex !== null ? places[transportBetweenIndex]?.transport?.find((t) => t.id === editingTransportLegId)?.documents ?? [] : [])) : [],
    }

    if (fromPlaceId === 'home') {
      // For transport from home, we need to add it to the first place
      const firstPlace = places[0]
      if (!firstPlace) return
      const prev = firstPlace.transport?.filter((t) => t.id !== editingTransportLegId) ?? []
      const updatedPlaces = places.map((p) =>
        p.id === firstPlace.id ? { ...p, transport: [...prev, leg] } : p,
      )
      setPlaces(updatedPlaces)
      savePlacesToTrip(updatedPlaces)
    } else if (transportBetweenIndex !== null) {
      const fromPlace = places[transportBetweenIndex]
      if (!fromPlace) return
      const prev = fromPlace.transport?.filter((t) => t.id !== editingTransportLegId) ?? []
      const updatedPlaces = places.map((p) =>
        p.id === fromPlace.id ? { ...p, transport: [...prev, leg] } : p,
      )
      setPlaces(updatedPlaces)
      savePlacesToTrip(updatedPlaces)
    }
    closeTransportModal()
  }

  useEffect(() => {
    const trips = loadTrips()
    const found = trips.find(t => t.id === id)
    if (found) {
      setTrip(found)
      // Load places from trip data and migrate to ensure required arrays exist
      setPlaces(migratePlaces(found.places || []))
    }
  }, [id])

  // Fade in wallpaper when trip wallpaper changes
  useEffect(() => {
    if (trip?.wallpaper) {
      setWallpaperOpacity(0)
      const timer = setTimeout(() => setWallpaperOpacity(1), 50)
      return () => clearTimeout(timer)
    }
  }, [trip?.wallpaper])

  // Save places to trip when they change
  // useEffect(() => {
  //   if (trip && places.length > 0) {
  //     updateTrip(trip.id, { places })
  //   }
  // }, [places, trip])

  // Handle deep linking to specific places from the global map
  useEffect(() => {
    const placeId = searchParams.get('place')
    if (placeId && places.length > 0) {
      const place = places.find(p => p.id === placeId)
      if (place) {
        setFocusedPlaceId(placeId)
        setSelectedPlaceForDetail(place)
        setIsPlaceDetailModalOpen(true)
        // Clean up the URL to prevent re-opening on refresh
        const newParams = new URLSearchParams(searchParams.toString())
        newParams.delete('place')
        const newRelativePathQuery = window.location.pathname + (newParams.toString() ? `?${newParams.toString()}` : '')
        router.replace(newRelativePathQuery)
      }
    }
  }, [searchParams, places, router])

  const wallpaperUrl = trip?.wallpaper?.trim()

  // Hide/show navigation elements when modals are open
  useEffect(() => {
    const hasModalOpen = isPlaceSearchOpen || isEventModalOpen || isTransportModalOpen || isEditModalOpen || isEmojiPickerInForm || isWallpaperPickerInForm
    
    // Find navigation elements
    const hamburgerButton = document.querySelector('.fixed.z-60') as HTMLElement
    const topHeader = document.querySelector('.fixed.z-50') as HTMLElement
    
    if (hamburgerButton) {
      hamburgerButton.style.display = hasModalOpen ? 'none' : ''
    }
    if (topHeader) {
      topHeader.style.display = hasModalOpen ? 'none' : ''
    }
  }, [isPlaceSearchOpen, isEventModalOpen, isTransportModalOpen, isEditModalOpen, isEmojiPickerInForm, isWallpaperPickerInForm])

  if (!trip) {
    return (
      <div className="min-h-screen bg-background text-on-surface font-body flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-neutral-600 mb-4">flight_takeoff</span>
          <p className="text-neutral-500">Loading trip...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-background text-on-surface font-body">
      {wallpaperUrl ? (
        <>
          <div
            className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700"
            style={{ backgroundImage: `url(${wallpaperUrl})`, opacity: wallpaperOpacity }}
            aria-hidden
          />
          <div
            className="pointer-events-none fixed inset-0 z-0 bg-black/10 backdrop-blur-sm"
            aria-hidden
          />
        </>
      ) : null}
      {/* Top Header - starts after hamburger menu */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-between bg-neutral-900/40 pl-20 pr-6 py-4 shadow-[inset_0_1px_0_rgba(143,245,255,0.1)] backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xl sm:text-2xl font-bold text-[#8ff5ff] font-['Space Grotesk'] tracking-tight hover:text-[#c3f400] transition-colors duration-300"
          >
            trippi
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-outline-variant/30 overflow-hidden">
            <img alt="Profile" src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face" />
          </div>
        </div>
      </header>

      {/* Floating Back Button */}
      {!isPlaceSearchOpen && !isEventModalOpen && !isTransportModalOpen && !isEditModalOpen && !isEmojiPickerInForm && !isWallpaperPickerInForm && (
        <Link href="/" className="fixed top-20 left-4 z-[40] w-8 h-8 bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-neutral-400 hover:bg-neutral-800/60 hover:text-white transition-all duration-300 active:scale-95 shadow-lg">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
        </Link>
      )}

      {/* Modal Backdrop Overrides for Floating Back Button */}
      {(isPlaceSearchOpen || isEventModalOpen || isTransportModalOpen || isEditModalOpen || isEmojiPickerInForm || isWallpaperPickerInForm) && (
        <button 
          onClick={() => {
            if (isEmojiPickerInForm) { /* Handled contextually or by picker itself */ }
            else if (isWallpaperPickerInForm) { /* Handled contextually */ }
            else if (isPlaceSearchOpen) resetPlaceModal()
            else if (isEventModalOpen) resetEventModal()
            else if (isTransportModalOpen) closeTransportModal()
            else if (isEditModalOpen) setIsEditModalOpen(false)
          }}
          className="fixed top-20 left-4 z-[60] w-8 h-8 bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-neutral-400 hover:bg-neutral-800/60 hover:text-white transition-all duration-300 active:scale-95 shadow-lg"
          aria-label="Close Modal"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
        </button>
      )}

      {/* Main Content */}
      <main className="relative z-10 min-h-screen pt-24 pb-32 px-4 sm:px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          {/* Trip Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{trip.emoji}</span>
              <div className="flex-1">
                <h1 className="text-4xl font-bold font-headline text-white">{trip.title}</h1>
                <p className="text-neutral-400">{trip.startDate}{trip.endDate && ` - ${trip.endDate}`}</p>
              </div>
              <button
                onClick={openEditModal}
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800/50 rounded-lg transition-colors"
                title="Edit trip details"
              >
                <span className="material-symbols-outlined">edit</span>
              </button>
            </div>
            {trip.description && (
              <p className="text-neutral-300 text-lg">{trip.description}</p>
            )}
          </div>

          {/* Three Main Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section 1: Unified Timeline */}
            <div className="space-y-4">
              <div className="bg-neutral-900/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 animate-in slide-in-from-left-4 duration-500 shadow-2xl">
                <div className="flex items-center justify-between mb-8 border-b border-neutral-800 pb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white font-headline flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary">timeline</span>
                      Itinerary
                    </h2>
                    <p className="text-neutral-500 text-sm mt-1">Plan your journey day by day</p>
                  </div>
                </div>

                <div className="space-y-8 relative">
                  {trip.places.length === 0 ? (
                    <div className="text-center py-12">
                      <span className="material-symbols-outlined text-6xl text-neutral-600 mb-4">location_on</span>
                      <h3 className="text-xl font-bold text-white mb-2">No places added yet</h3>
                      <p className="text-neutral-400 mb-4">Start building your itinerary by adding your first place</p>
                      <button
                        onClick={() => setIsPlaceSearchOpen(true)}
                        className="w-full bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 flex items-center justify-center gap-2 hover:bg-primary/20 hover:border-primary/60 transition-all text-primary font-semibold group active:scale-95 duration-150"
                      >
                        <span className="material-symbols-outlined text-lg">add_circle</span>
                        <span className="text-sm font-bold uppercase tracking-wider">Add your first place</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {allDays.map((day) => (
                        <div key={day.dayNumber} className="relative ml-[15px]">
                          {/* Day Header */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center gap-2">
                              <div className="text-xs font-bold text-primary font-mono uppercase tracking-wider">Day {day.dayNumber}</div>
                              <div className="text-sm text-neutral-400">•</div>
                              <div className="text-sm text-neutral-300">{day.formattedDate}</div>
                              <div className="text-xs text-neutral-500">({day.places.length} place{day.places.length !== 1 ? 's' : ''})</div>
                            </div>
                          </div>

                          {/* Vertical Timeline for the Day */}
                          <div className="relative">
                            {/* Vertical Line */}
                            <div className="absolute left-0 top-0 bottom-0 w-px bg-neutral-700"></div>

                            {day.places.length === 0 ? (
                              <div className="relative flex items-center gap-4 mb-4">
                                <div className="flex flex-col items-end gap-1 w-[50px] shrink-0">
                                  <div className="w-8 h-8 bg-neutral-600/20 rounded-full flex items-center justify-center border border-neutral-600/30">
                                    <span className="material-symbols-outlined text-neutral-600 text-sm">location_on</span>
                                  </div>
                                </div>
                                <div className="flex-1 bg-neutral-900/20 backdrop-blur-xl border border-white/10 rounded-xl p-4 text-center">
                                  <span className="material-symbols-outlined text-4xl text-neutral-600 mb-2">location_on</span>
                                  <h4 className="text-white font-medium mb-1">No places yet</h4>
                                  <p className="text-neutral-400 text-sm mb-3">Add your first place to this day</p>
                                  <button
                                    onClick={() => {
                                      setNewPlaceDay(day.dayNumber)
                                      setIsPlaceSearchOpen(true)
                                    }}
                                    className="text-primary hover:text-primary/80 font-medium text-sm underline"
                                  >
                                    Add your first place
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {day.places.map((place, idx) => {
                                  const isLastInDay = idx === day.places.length - 1;

                                  return (
                                    <div key={place.id} className="relative flex items-center gap-4 mb-4">
                                      {/* Timeline Section with Times */}
                                      <div className="flex flex-col items-end gap-1 w-[50px] shrink-0">
                                        {/* Timeline Dot */}
                                        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
                                          <span className="material-symbols-outlined text-primary text-sm">location_on</span>
                                        </div>

                                        {/* Arrival Time */}
                                        <div className="flex flex-col items-end">
                                          <span className="text-xs font-bold text-white font-mono leading-none">{place.arrival || '--:--'}</span>
                                          <span className="text-[8px] text-neutral-500 uppercase font-bold tracking-tighter">Arr</span>
                                        </div>

                                        {/* Departure Time */}
                                        <div className="flex flex-col items-end mt-1">
                                          <span className="text-xs font-bold text-neutral-400 font-mono leading-none">{place.departure || '--:--'}</span>
                                          <span className="text-[8px] text-neutral-600 uppercase font-bold tracking-tighter">Dep</span>
                                        </div>
                                      </div>

                                      {/* Place Card */}
                                      <div className="flex-1 bg-neutral-900/20 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:bg-neutral-800/30 transition-all duration-300 group cursor-pointer"
                                           onClick={() => {
                                             startEditingPlace(place)
                                           }}>
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                              <div className="w-40 overflow-hidden">
                                                <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors w-full line-clamp-2 leading-tight text-justify">{place.name}</h4>
                                                <p className="text-neutral-500 text-xs line-clamp-1">{place.location}</p>
                                              </div>
                                            </div>

                                            {/* Events for this place */}
                                            {place.events && place.events.length > 0 && (
                                              <div className="mt-3 space-y-2">
                                                {place.events.map((event, eventIdx) => (
                                                  <div key={eventIdx} className="flex items-center gap-2 p-2 bg-neutral-800/30 rounded-lg">
                                                    <span className="text-sm">{event.emoji || '📅'}</span>
                                                    <div className="flex-1">
                                                      <div className="text-white text-sm font-medium">{event.title}</div>
                                                      {event.time && <div className="text-neutral-400 text-xs">🕐 {event.time}</div>}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>

                                          {/* Action buttons */}
                                          <div className="flex items-center gap-1 ml-4">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setEventPlaceId(place.id)
                                                setIsEventModalOpen(true)
                                              }}
                                              className="p-1.5 text-neutral-500 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                              title="Add event"
                                            >
                                              <span className="material-symbols-outlined text-base">event</span>
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                if (confirm(`Remove "${place.name}" from your itinerary?`)) {
                                                  const updatedPlaces = places.filter(p => p.id !== place.id)
                                                  setPlaces(updatedPlaces)
                                                  savePlacesToTrip(updatedPlaces)
                                                }
                                              }}
                                              className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                              title="Remove place"
                                            >
                                              <span className="material-symbols-outlined text-base">delete</span>
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Add Place Button at the end of the timeline */}
                                <div className="relative flex items-center gap-4 mb-4">
                                  <div className="flex flex-col items-end gap-1 w-[50px] shrink-0">
                                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
                                      <span className="material-symbols-outlined text-primary text-sm">add_circle</span>
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <button
                                      onClick={() => {
                                        setNewPlaceDay(day.dayNumber)
                                        setIsPlaceSearchOpen(true)
                                      }}
                                      className="w-full bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 flex items-center justify-center gap-2 hover:bg-primary/20 hover:border-primary/60 transition-all text-primary font-semibold group active:scale-95 duration-150"
                                    >
                                      <span className="text-sm font-bold uppercase tracking-wider">Add Place</span>
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Map with Itinerary */}
            <div className="space-y-4">
              <div className="bg-neutral-900/20 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden sticky top-24 shadow-2xl">
                <div className="p-4 border-b border-neutral-700">
                  <h2 className="text-lg font-bold text-white font-headline">Trip Map</h2>
                  <p className="text-neutral-400 text-sm">All places with connecting routes</p>
                </div>
                {places.length > 0 ? (
                  <div className="relative">
                    <Map 
                      places={places} 
                      emoji={trip?.emoji} 
                      focusedPlaceId={focusedPlaceId}
                      showDayNumbers={true}
                    />
                  </div>
                ) : (
                  <div className="h-96 flex items-center justify-center bg-neutral-800/10 rounded-b-xl border border-dashed border-neutral-700 m-4">
                    <div className="text-center p-8">
                      <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-neutral-500 text-3xl">map</span>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">No Map Data</h3>
                      <p className="text-neutral-400 max-w-xs mx-auto">Add at least one place with a location to see your route on the map.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Place Search Modal */}
      {isPlaceSearchOpen && (
        <div className="modal-backdrop animate-in fade-in duration-300 p-4 md:p-8">
          <div className="modal-container w-full max-w-5xl h-full md:h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col md:flex-row">
            {/* Left Side: Search & Selection (Visible on Step 1 in Mobile) */}
            <div className={`flex flex-col flex-1 md:flex-[0.8] border-b md:border-b-0 md:border-r border-white/10 overflow-hidden h-full ${mobileStep === 2 ? 'hidden md:flex' : 'flex'}`}>
              {/* Input Mode Tabs */}
              <div className="p-3 md:p-4 flex gap-2 md:gap-4 border-b border-white/10 bg-white/2">
                <button
                  onClick={() => setPlaceInputMode('search')}
                  className={`flex-1 py-1.5 px-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    placeInputMode === 'search'
                      ? 'bg-primary text-black'
                      : 'bg-white/5 border border-white/10 text-neutral-400 hover:bg-white/10'
                  }`}
                >
                  Search
                </button>
                <button
                  onClick={() => setPlaceInputMode('manual')}
                  className={`flex-1 py-1.5 px-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    placeInputMode === 'manual'
                      ? 'bg-primary text-black'
                      : 'bg-white/5 border border-white/10 text-neutral-400 hover:bg-white/10'
                  }`}
                >
                  Manual
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {placeInputMode === 'search' ? (
                  <div className="p-4 space-y-4">
                    <div className="relative">
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for a place..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-12 py-3 md:py-4 text-white placeholder-neutral-500 focus:border-primary/50 outline-none transition-all"
                      />
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">search</span>
                      {isSearching && <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-primary animate-spin">refresh</span>}
                    </div>

                    <div className="space-y-2 pb-4">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => selectPlaceFromSearch(result)}
                          className={`w-full p-4 rounded-2xl text-left transition-all border ${
                            selectedSearchResult?.id === result.id
                              ? 'bg-primary/20 border-primary shadow-lg shadow-primary/10 scale-[1.01]'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <h4 className="font-bold text-white text-base leading-tight block w-full line-clamp-2 italic">{result.name}</h4>
                          <p className="text-xs text-neutral-400 truncate mt-0.5 uppercase tracking-wider">{result.location}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-neutral-500 uppercase ml-1 tracking-widest">Google Maps Link</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={mapsUrlInput}
                            onChange={(e) => {
                              const val = e.target.value
                              setMapsUrlInput(val)
                              if (val.includes('maps.google') || val.includes('goo.gl/maps')) {
                                parseGoogleMapsUrl(val)
                              }
                            }}
                            placeholder="Paste link to locate place..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-primary/50 outline-none pr-10"
                          />
                          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">link</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-neutral-500 uppercase ml-1 tracking-widest">Place Name</label>
                        <input
                          type="text"
                          value={manualPlaceName}
                          onChange={(e) => setManualPlaceName(e.target.value)}
                          placeholder="e.g. Eiffel Tower"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-neutral-500 uppercase ml-1 tracking-widest">City / Area</label>
                        <input
                          type="text"
                          value={manualPlaceLocation}
                          onChange={(e) => setManualPlaceLocation(e.target.value)}
                          placeholder="e.g. Paris"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-neutral-500 uppercase ml-1 tracking-widest">Country</label>
                        <input
                          type="text"
                          value={manualPlaceCountry}
                          onChange={(e) => setManualPlaceCountry(e.target.value)}
                          placeholder="e.g. France"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Internal Map Preview */}
              <div className="h-32 md:h-44 p-4 pt-0 shrink-0">
                <div className="h-full w-full rounded-2xl bg-black/40 border border-white/10 overflow-hidden relative group">
                  <Map 
                    places={[]} 
                    previewCoords={mapPreviewCoords}
                    onClick={(coords) => setMapPreviewCoords(coords)}
                  />
                  {!mapPreviewCoords && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] text-neutral-500">
                      <span className="material-symbols-outlined text-3xl mb-1">map</span>
                      <p className="text-[10px] font-black uppercase tracking-widest">Map Preview Area</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Next Button */}
              <div className="md:hidden p-4 border-t border-white/10 bg-white/5">
                <button
                  onClick={() => setMobileStep(2)}
                  disabled={!selectedSearchResult && (!manualPlaceName.trim() || !manualPlaceLocation.trim())}
                  className="btn-primary w-full btn-md flex items-center justify-center gap-2"
                >
                  Configure Details
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Right Side: Form Details (Visible on Step 2 in Mobile) */}
            <div className={`flex flex-col flex-1 bg-white/5 overflow-y-auto md:overflow-hidden h-full ${mobileStep === 1 ? 'hidden md:flex' : 'flex'}`}>
              <div className="md:hidden p-4 border-b border-white/10 flex items-center gap-4 bg-white/5">
                <button
                  onClick={() => setMobileStep(1)}
                  className="w-8 h-8 bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-neutral-400 hover:bg-neutral-800/60 hover:text-white transition-all duration-300 active:scale-95 shadow-lg shrink-0"
                  aria-label="Back to Search"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                </button>
                <div className="flex-1 min-w-0 ml-10"> {/* Offset for overlapping back button when shown */}
                  <h4 className="text-white font-bold truncate leading-none">{selectedSearchResult?.name || manualPlaceName || 'New Place'}</h4>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1 truncate">{selectedSearchResult?.location || manualPlaceLocation || 'Configure Details'}</p>
                </div>
              </div>

              {(selectedSearchResult || (manualPlaceName.trim() && manualPlaceLocation.trim())) ? (
                <div className="flex flex-col min-h-full">
                  <div className="flex-1">
                    <PlaceForm
                      saveLabel={placeModalMode === 'edit' ? 'Update Trip' : 'Add to Trip'}
                      place={{
                        id: selectedSearchResult?.id || (placeModalMode === 'edit' ? editingPlace?.id : 'manual'),
                        name: selectedSearchResult?.name || manualPlaceName,
                        location: selectedSearchResult?.location || manualPlaceLocation,
                        country: selectedSearchResult?.country || manualPlaceCountry,
                        arrival: newPlaceArrival,
                        departure: newPlaceDeparture,
                        day: newPlaceDay,
                        notes: newPlaceNotes,
                        documents: newPlaceDocuments,
                        links: newPlaceLinks,
                        events: newPlaceEvents,
                        transition: !!(selectedSearchResult || (manualPlaceName.trim() && manualPlaceLocation.trim())),
                        lat: selectedSearchResult?.coordinates.lat || mapPreviewCoords?.lat || (placeModalMode === 'edit' ? editingPlace?.lat : 0),
                        lng: selectedSearchResult?.coordinates.lng || mapPreviewCoords?.lng || (placeModalMode === 'edit' ? editingPlace?.lng : 0)
                      } as unknown as Place}
                      allDaysCount={allDays.length}
                      onChange={(updated) => {
                        if (updated.arrival) setNewPlaceArrival(updated.arrival)
                        if (updated.departure) setNewPlaceDeparture(updated.departure)
                        if (updated.day !== undefined) setNewPlaceDay(updated.day)
                        if (updated.notes !== undefined) setNewPlaceNotes(updated.notes)
                        if (updated.documents) setNewPlaceDocuments(updated.documents)
                        if (updated.links) setNewPlaceLinks(updated.links)
                        if (updated.events) setNewPlaceEvents(updated.events)
                      }}
                      onSave={addPlace}
                      onCancel={() => resetPlaceModal()}
                      disableSave={!selectedSearchResult && (!manualPlaceName.trim() || !manualPlaceLocation.trim() || !manualPlaceCountry.trim())}
                    />
                  </div>
                  {placeModalMode === 'edit' && editingPlace && (
                    <div className="px-6 pb-6 mt-auto">
                      <button
                        onClick={() => deletePlace(editingPlace.id)}
                        className="w-full px-6 py-4 text-red-400 hover:bg-red-400/10 transition-colors rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 border border-red-400/20"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        Remove from Trip
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-neutral-600">travel_explore</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white italic">Begin your journey</h3>
                    <p className="text-sm text-neutral-500 max-w-xs uppercase tracking-tighter font-black">Search for a location or add details manually to start planning.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {isEventModalOpen && (
        <div className="modal-backdrop p-4 md:p-8">
          <div className="modal-container w-full max-w-md max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center gap-4 p-6 border-b border-white/10 bg-white/5">
              <div className="w-10 h-10 shrink-0" /> {/* Spacer for floating back button */}
              <h2 className="text-heading-4 text-white">Add Event</h2>
            </div>

            {/* Event Form */}
            <div className="p-6 space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-white">Create New Event</h3>
                <p className="text-neutral-400 text-sm">
                  {places.find(p => p.id === eventPlaceId)?.name}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Event Title</label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="Enter event title"
                    className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded text-white placeholder-neutral-500 focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Description</label>
                  <textarea
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    placeholder="Event description (optional)"
                    rows={3}
                    className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded text-white placeholder-neutral-500 focus:border-primary outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Date</label>
                  <select
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded text-white focus:border-primary outline-none"
                  >
                    <option value="">Select a date</option>
                    {(() => {
                      const options = []
                      if (trip.startDate && trip.endDate) {
                        const start = new Date(trip.startDate)
                        const end = new Date(trip.endDate)
                        const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
                        
                        for (let i = 0; i < dayCount; i++) {
                          const dayDate = new Date(start)
                          dayDate.setDate(start.getDate() + i)
                          const dateValue = dayDate.toISOString().split('T')[0]
                          const formattedDate = dayDate.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })
                          options.push(
                            <option key={dateValue} value={dateValue}>
                              Day {i + 1} - {formattedDate}
                            </option>
                          )
                        }
                      }
                      return options
                    })()}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Time (Optional)</label>
                  <TimePicker
                    value={eventTime}
                    onChange={setEventTime}
                    placeholder="Select event time"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  onClick={resetEventModal}
                  className="btn-secondary btn-md flex-1 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEvent}
                  disabled={!eventTitle.trim()}
                  className="btn-primary btn-md flex-1 text-xs"
                >
                  Add Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transport leg: mode + times (saved on trip places) */}
      {isTransportModalOpen && transportBetweenIndex !== null && transportToPlaceId && (
        <div className="modal-backdrop p-4">
          <div className="modal-container max-h-[90vh] w-full max-w-md overflow-y-auto">
            <div className="flex items-center gap-4 border-b border-neutral-700 p-5 bg-white/5 backdrop-blur-xl">
              <div className="w-10 h-10 shrink-0" /> {/* Spacer for floating back button */}
              <h2 className="font-headline text-xl font-bold text-white">Transport</h2>
              <div className="ml-auto">
                {editingTransportLegId && (
                  <button
                    onClick={deleteTransportLeg}
                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
                    title="Delete Transport"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-5 p-5">
              <p className="text-center text-sm text-neutral-400">
                <span className="font-medium text-white">{places[transportBetweenIndex]?.name}</span>
                <span className="mx-1">→</span>
                <span className="font-medium text-white">
                  {places.find((p) => p.id === transportToPlaceId)?.name}
                </span>
              </p>

              <div>
                <p className="mb-2 text-sm font-medium text-white">How are you traveling?</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {TRANSPORT_MODES.map((m) => (
                    <button
                      key={m.type}
                      type="button"
                      onClick={() => setSelectedTransportMode(m.type)}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-3 transition-all ${
                        selectedTransportMode === m.type
                          ? 'border-primary bg-primary/15 ring-1 ring-primary/50'
                          : 'border-neutral-700 bg-surface-container-highest hover:border-neutral-500'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-2xl ${m.color}`}>{m.icon}</span>
                      <span className="text-xs font-medium text-white">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white">Leave (depart)</label>
                  <TimePicker
                    value={transportLegDeparture}
                    onChange={setTransportLegDeparture}
                    placeholder="Departure time"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white">Arrive</label>
                  <TimePicker
                    value={transportLegArrival}
                    onChange={setTransportLegArrival}
                    placeholder="Arrival time"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">Duration (optional)</label>
                <input
                  type="text"
                  value={transportLegDuration}
                  onChange={(e) => setTransportLegDuration(e.target.value)}
                  placeholder="e.g. 2h 30m"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 py-2.5 text-white placeholder:text-neutral-500 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-6 border-t border-white/5">
                <button
                  type="button"
                  onClick={closeTransportModal}
                  className="btn-secondary btn-md flex-1 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveTransportLeg}
                  disabled={!selectedTransportMode}
                  className="btn-primary btn-md flex-1 text-xs"
                >
                  Save Transport
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Place Detail Modal (Unified with Add Place UI) */}
      {isPlaceDetailModalOpen && selectedPlaceForDetail && (
        <div className="modal-backdrop z-[100] p-4 animate-in fade-in duration-300 overflow-y-auto">
          <div className="modal-container w-full max-w-2xl my-auto rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-300">
            <PlaceForm
              saveLabel="Save Changes"
              place={selectedPlaceForDetail}
              allDaysCount={allDays.length}
              onChange={(updated) => setSelectedPlaceForDetail({ ...selectedPlaceForDetail, ...updated } as Place)}
              onSave={savePlaceDetailEdits}
              onCancel={() => {
                setIsPlaceDetailModalOpen(false)
                setSelectedPlaceForDetail(null)
              }}
            />
          </div>
        </div>
      )}

      {/* Bottom Navigation (Mobile) */}
      {!isPlaceSearchOpen && (
        <div className="md:hidden fixed bottom-8 w-full flex justify-center z-50">
          <nav className="bg-neutral-950/80 backdrop-blur-2xl w-[90%] max-w-md rounded-full border border-white/10 flex justify-between items-center p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <Link className="text-neutral-400 px-4 py-2 flex flex-col items-center gap-1" href="/">
              <span className="material-symbols-outlined">grid_view</span>
              <span className="font-headline text-[8px] uppercase">Home</span>
            </Link>
            <Link className="bg-cyan-400 text-black rounded-full px-6 py-2 flex items-center gap-2 scale-105 transition-transform" href={`/trip/${id}`}>
              <span className="material-symbols-outlined text-[20px]">map</span>
              <span className="font-headline text-[10px] uppercase font-bold">Trip</span>
            </Link>
            <Link className="text-neutral-400 px-4 py-2 flex flex-col items-center gap-1" href="/trip/new">
              <span className="material-symbols-outlined">add</span>
              <span className="font-headline text-[8px] uppercase">New</span>
            </Link>
          </nav>
        </div>
      )}

      {/* Edit Trip Modal - uses reusable TripForm */}
      {isEditModalOpen && trip && (
        <div className="modal-backdrop overflow-y-auto p-4 md:p-8">
          <div className="modal-container min-h-screen md:min-h-auto w-full max-w-4xl my-8">
            <TripForm
              initialValues={{
                emoji: trip.emoji,
                title: trip.title,
                description: trip.description,
                startDate: trip.startDate,
                endDate: trip.endDate,
                wallpaper: trip.wallpaper
              }}
              onSubmit={handleEditSubmit}
              onCancel={() => setIsEditModalOpen(false)}
              isSubmitting={isEditSubmitting}
              submitButtonText="Save Changes"
              onEmojiPickerToggle={setIsEmojiPickerInForm}
              onWallpaperPickerToggle={setIsWallpaperPickerInForm}
            />
          </div>
        </div>
      )}
    </div>
  )
}
