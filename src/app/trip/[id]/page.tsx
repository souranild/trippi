'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Trip, loadTrips, updateTrip, updatePlace, removePlace, Document, Link as PlaceLink } from '@/lib/storage'
import { useTrips } from '@/context/TripContext'
import EmojiAvatar from '@/components/EmojiAvatar'
import { searchWallpapers, getRandomPlaceholder, searchWikipediaImages } from '@/lib/wallpaper-search'
import TripForm from '@/components/TripForm'
import TimePicker from '@/components/TimePicker'
import PlaceForm from '@/components/PlaceForm'
import PlaceDetailModal from '@/components/PlaceDetailModal'
import TransportDetailModal from '@/components/TransportDetailModal'
import ShareModal from '@/components/ShareModal'
import ParallaxBackground from '@/components/ParallaxBackground'
import type { Event as TripEvent, Accommodation, Place, Transport, TransportMode, Note } from '@/lib/storage'
import type { PlaceSearchHit } from '@/lib/places-search'
import {
  TRANSPORT_MODES,
  normalizeTransportMode,
  transportModeIcon,
  transportModeLabel,
} from '@/lib/transport-options'
import { getGlobalItinerary, getItemBounds, ItineraryItem, isTimeAfter } from '@/lib/itinerary-utils'
import {
  ModalBackdrop,
  ModalContainer,
  ModalHeader,
  ModalContent,
  ModalFooter
} from '@/components/ModalLayout'
import AttachmentModal, { type AttachmentType, type AttachmentPayload } from '@/components/AttachmentModal'
import AttachmentDetailModal, { type AttachmentDetailData } from '@/components/AttachmentDetailModal'
import AppHeader from '@/components/AppHeader'
import ItineraryTable from '@/components/ItineraryTable'
import MediaViewer from '@/components/MediaViewer'
import { formatDate, formatDuration, formatDateShort } from '@/lib/date-utils'
import LocationPickerModal from '@/components/LocationPickerModal'

function formatTime12h(time: string): string {
  if (!time) return ''
  const m24 = time.match(/^(\d{1,2}):(\d{2})$/)
  if (m24) {
    let h = parseInt(m24[1])
    const min = m24[2]
    const period = h >= 12 ? 'PM' : 'AM'
    if (h === 0) h = 12
    else if (h > 12) h -= 12
    return `${h}:${min} ${period}`
  }
  return time
}

const emojis = [
  '✈️', '🏖️', '🏔️', '🏙️', '🌴', '🏰', '🗽', '🗼', '🎭', '🍜', '🏃', '🎨', '🎵', '🍷', '🏂', '🚀',
  '🌍', '🏕️', '🏝️', '🌄', '🌅', '🏞️', '🏜️', '🏯', '🕌', '⛩️', '🏛️', '🎡', '🎢', '🎠', '🏟️', '🎪',
  '🍕', '🍔', '🍟', '🌭', '🍿', '🍩', '🍪', '🎂', '🍰', '🧁', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼',
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🏏', '⛳', '🏹',
  '🎸', '🎹', '🥁', '🎷', '🎺', '🪕', '🎻', '🎤', '🎧', '🎼', '🎶', '🎙️', '🎚️', '🎛️', '🎯',
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲',
  '⛵', '🛶', '🚤', '🛳️', '⛴️', '🚢', '🛩️', '🛫', '🛬', '🚁', '🚟', '🚠', '🚡', '🛤️', '🛸'
]

import MapSlot from '@/components/Map/MapSlot'
import { useMapContext } from '@/context/MapContext'
import { fetchHybridDiscovery, searchLocations as trippiSearchLocations, parseGoogleMapsUrl } from '@/lib/discovery'
const EMPTY_ARRAY: any[] = []
const EMPTY_PLACES: any[] = []

export default function TripDetail() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { updateTrip: updateTripContext, deleteTrip, userProfile, setIsEditingProfile } = useTrips()
  const { discoveries, setDiscoveries, setIsExpanded } = useMapContext()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [places, setPlaces] = useState<Place[]>([])
  
  // -- View State --
  const [itineraryViewMode, setItineraryViewMode] = useState<'timeline' | 'table'>('timeline')
  const [showMap, setShowMap] = useState(true)
  const [showPlaces, setShowPlaces] = useState(true)
  const [showTransports, setShowTransports] = useState(true)
  const [showAccommodations, setShowAccommodations] = useState(true)
  const [showEvents, setShowEvents] = useState(true)
  const [showDocuments, setShowDocuments] = useState(true)
  const [showLinks, setShowLinks] = useState(true)
  const [isViewSettingsOpen, setIsViewSettingsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileStep, setMobileStep] = useState<1 | 2>(1)
  
  // -- Map & Location State --
  const [mapViewport, setMapViewport] = useState<{ center: { lat: number, lng: number }, zoom: number } | null>(null)
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null)
  const [mapPreviewCoords, setMapPreviewCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [livePlaceId, setLivePlaceId] = useState<string | null>(null)
  const [liveTransportId, setLiveTransportId] = useState<string | null>(null)
  
  // -- Search & Modal State --
  const [isPlaceSearchOpen, setIsPlaceSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PlaceSearchHit[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedSearchResult, setSelectedSearchResult] = useState<PlaceSearchHit | null>(null)
  const [configuringNewPlace, setConfiguringNewPlace] = useState<Place | null>(null)
  const [editingPlaceForDetail, setEditingPlaceForDetail] = useState<Place | null>(null)
  const [isPlaceDetailModalOpen, setIsPlaceDetailModalOpen] = useState(false)
  const [placeDetailInitialDay, setPlaceDetailInitialDay] = useState<number | undefined>()
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false)
  const [isMobileMapClosing, setIsMobileMapClosing] = useState(false)
  const [manualPlaceName, setManualPlaceName] = useState('')
  const [manualPlaceLocation, setManualPlaceLocation] = useState('')
  const [manualPlaceCountry, setManualPlaceCountry] = useState('')
  const [newPlaceDay, setNewPlaceDay] = useState<number>(1)
  const [newPlaceEndDay, setNewPlaceEndDay] = useState<number>(1)
  const [newPlacePhotos, setNewPlacePhotos] = useState<string[]>([])
  const [placeInputMode, setPlaceInputMode] = useState<'search' | 'manual'>('search')
  const searchAbortRef = useRef<AbortController | null>(null)

  // -- Transport & Edit State --
  const [isTransportModalOpen, setIsTransportModalOpen] = useState(false)
  const [editingTransportLegId, setEditingTransportLegId] = useState<string | null>(null)
  const [transportBetweenIndex, setTransportBetweenIndex] = useState<number | null>(null)
  const [transportToPlaceId, setTransportToPlaceId] = useState<string | null>(null)
  const [transportLegDefaultDay, setTransportLegDefaultDay] = useState<number | null>(null)
  const [transportMinDay, setTransportMinDay] = useState<number>(1)
  const [transportMinTime, setTransportMinTime] = useState<string>('')
  const [transportMaxDay, setTransportMaxDay] = useState<number>(999)
  const [transportMaxTime, setTransportMaxTime] = useState<string>('')
  const [transportLegDeparture, setTransportLegDeparture] = useState('')
  const [transportLegArrival, setTransportLegArrival] = useState('')
  const [transportLegDuration, setTransportLegDuration] = useState('')
  const [transportLegDocuments, setTransportLegDocuments] = useState<Document[]>([])
  const [selectedTransportMode, setSelectedTransportMode] = useState<TransportMode | null>(null)
  const [transportLegTitle, setTransportLegTitle] = useState('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [mediaViewer, setMediaViewer] = useState<{ items: string[]; index: number } | null>(null)
  const [previewWallpaper, setPreviewWallpaper] = useState<string | null>(null)
  const [wallpaperOpacity, setWallpaperOpacity] = useState(1)

  // -- Callbacks (Order is Important!) --

  const getLatestTimeOnDay = useCallback((dayNum: number): string => {
    if (!trip) return '09:00'
    const queue = getGlobalItinerary({ ...trip, places } as Trip)
    const dayItems = queue.filter(item => {
      if (item.type === 'place') {
        const start = item.data.day || 1
        const end = item.data.endDay || start
        return dayNum >= start && dayNum <= end
      } else {
        return item.data.departureDay === dayNum || item.data.arrivalDay === dayNum
      }
    })

    let lastTime = '09:00'
    if (dayItems.length > 0) {
      const lastItem = dayItems[dayItems.length - 1]
      if (lastItem.type === 'place') {
        lastTime = lastItem.data.departure || lastItem.data.arrival || '09:00'
      } else {
        lastTime = lastItem.data.arrival || lastItem.data.departure || '09:00'
      }
    } else if (dayNum > 1) {
      return getLatestTimeOnDay(dayNum - 1)
    }

    const [h, m] = lastTime.split(':').map(Number)
    const nextH = (h + 1) % 24
    return `${nextH.toString().padStart(2, '0')}:${(m || 0).toString().padStart(2, '0')}`
  }, [trip, places])

  const selectPlaceFromSearch = useCallback((place: any) => {
    setSelectedSearchResult(place)
    setIsPlaceSearchOpen(false)
    const lat = place.coordinates?.lat || place.lat;
    const lng = place.coordinates?.lng || place.lng;
    setMapPreviewCoords({ lat, lng })
    
    setManualPlaceName(place.name)
    const isCityOrDistrict = place.type === 'district' || place.type === 'city'
    const addressStr = place.address || place.location || ''
    const placeLocation = place.address || (isCityOrDistrict ? place.name : (place.city || addressStr.split(',')[0]?.trim() || place.name))
    setManualPlaceLocation(placeLocation)
    setManualPlaceCountry(place.country || addressStr.split(',').pop()?.trim() || '')

    if (editingPlaceForDetail) {
      setEditingPlaceForDetail({
        ...editingPlaceForDetail,
        name: place.name,
        originalName: place.originalName || place.name,
        location: placeLocation,
        country: place.country || addressStr.split(',').pop()?.trim() || '',
        lat,
        lng,
        photos: (place.images && place.images.length > 0) ? place.images : (place.image ? [place.image] : editingPlaceForDetail.photos),
        notes: place.description ? [{ day: editingPlaceForDetail.day || 1, text: place.description }, ...editingPlaceForDetail.notes] : editingPlaceForDetail.notes
      })
      return
    }

    if (configuringNewPlace) {
      setConfiguringNewPlace({
        ...configuringNewPlace,
        name: place.name,
        originalName: place.originalName || place.name,
        location: placeLocation,
        country: place.country || addressStr.split(',').pop()?.trim() || '',
        lat,
        lng,
        photos: (place.images && place.images.length > 0) ? place.images : (place.image ? [place.image] : configuringNewPlace.photos),
        notes: place.description ? [{ day: configuringNewPlace.day || 1, text: place.description }, ...configuringNewPlace.notes] : configuringNewPlace.notes
      })
      return
    }

    const suggestedArrival = getLatestTimeOnDay(newPlaceDay)
    const [h, m] = suggestedArrival.split(':').map(Number)
    const depH = (h + 3) % 24
    const suggestedDeparture = `${depH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`

    const draft: Place = {
      id: `temp-${Date.now()}`,
      name: place.name,
      originalName: place.originalName || place.name,
      location: placeLocation,
      country: place.country || addressStr.split(',').pop()?.trim() || '',
      lat,
      lng,
      emoji: place.emoji || '📍',
      day: newPlaceDay,
      endDay: newPlaceEndDay,
      arrival: suggestedArrival,
      departure: suggestedDeparture,
      notes: place.description ? [{ day: newPlaceDay, text: place.description }] : [],
      events: [],
      photos: place.images || (place.image ? [place.image] : []),
      documents: [],
      links: []
    }
    setConfiguringNewPlace(draft)
  }, [newPlaceDay, newPlaceEndDay, getLatestTimeOnDay, editingPlaceForDetail, configuringNewPlace]);

  const handleAddDiscovery = useCallback((discovery: any) => {
    selectPlaceFromSearch(discovery);
  }, [selectPlaceFromSearch]);

  const handleViewportChange = useCallback((center: { lat: number, lng: number }, zoom: number) => {
    setMapViewport({ center, zoom })
  }, [])

  const handleStyleChange = useCallback((style: string) => {
    if (trip) {
      const updatedTrip = { ...trip, mapStyle: style };
      setTrip(updatedTrip);
      updateTripContext(updatedTrip);
    }
  }, [trip, updateTripContext]);

  const closeMobileMap = useCallback(() => {
    setIsMobileMapClosing(true)
    setTimeout(() => {
      setIsMobileMapOpen(false)
      setIsMobileMapClosing(false)
    }, 400)
  }, [])

  const focusPlace = useCallback((place: Place) => {
    setFocusedPlaceId(place.id)
    if (isMobile) setIsMobileMapOpen(false);
    
    setTimeout(() => {
      const startParts = trip?.startDate.split('-').map(Number) || [2024, 1, 1];
      const startObj = new Date(startParts[0], startParts[1] - 1, startParts[2]);
      const todayObj = new Date();
      const diffTime = todayObj.getTime() - startObj.getTime();
      const currentTripDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const placeStart = place.day || 1;
      const placeEnd = place.endDay || placeStart;
      const placeDay = Math.max(placeStart, Math.min(currentTripDay, placeEnd));
      
      const element = document.getElementById(`day-${placeDay}-place-${place.id}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Pulse highlight
        element.animate([
          { boxShadow: '0 0 0 0px rgba(34, 211, 238, 0)', backgroundColor: 'rgba(34, 211, 238, 0)' },
          { boxShadow: '0 0 0 4px rgba(34, 211, 238, 0.4)', backgroundColor: 'rgba(34, 211, 238, 0.1)' },
          { boxShadow: '0 0 0 0px rgba(34, 211, 238, 0)', backgroundColor: 'rgba(34, 211, 238, 0)' }
        ], { duration: 2000, iterations: 1 })
      }
    }, 100);
    
    setEditingPlaceForDetail(place)
    setPlaceDetailInitialDay(place.day || 1)
    setIsPlaceDetailModalOpen(true)
  }, [trip, isMobile]);

  const handleMobileMarkerClick = useCallback((place: Place) => {
    setFocusedPlaceId(place.id);
    closeMobileMap();
    setTimeout(() => {
       const el = document.getElementById(`day-${place.day || 1}-place-${place.id}`);
       if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 500);
  }, [closeMobileMap]);

  const handleMapClick = useCallback((coords: { lat: number, lng: number }) => {
    setMapPreviewCoords(coords)
    setPlaceInputMode('manual')
    setIsPlaceSearchOpen(true)
    setIsExpanded(true)
    setManualPlaceName('')
    setManualPlaceLocation(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`)
  }, [setIsExpanded]);


  const getMediaType = (url: string): 'image' | 'video' | 'pdf' | 'other' => {
    if (url.startsWith('data:video') || url.includes('video') || url.match(/\.(mp4|webm|ogg)$/i)) return 'video'
    if (url.startsWith('data:application/pdf') || url.match(/\.pdf$/i)) return 'pdf'
    if (url.startsWith('data:image') || url.includes('image') || url.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) || url.includes('pexels')) return 'image'
    return 'other'
  }

  const openViewer = useCallback((media: string[], index: number) => {
    setMediaViewer({ items: media, index })
  }, [])
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 150)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 150)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Track mobile state for map slot logic
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ScrollSpy to update focusedPlaceId as user scrolls through the timeline
  useEffect(() => {
    if (itineraryViewMode !== 'timeline' || places.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry that has the largest intersection ratio if multiple are visible
        // or just the first intersecting one in the focus zone
        const activeEntry = entries.find(e => e.isIntersecting);
        if (activeEntry) {
          const id = activeEntry.target.id;
          const match = id.match(/day-\d+-place-(.+)/);
          if (match && match[1]) {
            // Only update if it's different to avoid redundant state updates
            setFocusedPlaceId(prev => {
              if (prev === match[1]) return prev;
              return match[1];
            });
          }
        }
      },
      {
        // Focus zone is the middle 30% of the screen
        rootMargin: '-35% 0px -35% 0px',
        threshold: 0,
      }
    );

    // Select all place containers in the timeline
    const elements = document.querySelectorAll('[id^="day-"][id*="-place-"]');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [itineraryViewMode, places]);

  const fetchDiscoveries = async () => {
    // Determine search center: first place in trip, or world center if empty
    let center = { lat: 20, lng: 0 };
    if (places.length > 0 && places[0].lat && places[0].lng) {
      center = { lat: Number(places[0].lat), lng: Number(places[0].lng) };
    } else if (mapViewport?.center) {
      center = mapViewport.center;
    }

    setIsDiscovering(true);
    try {
      const resp = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gsradius=10000&gscoord=${center.lat}|${center.lng}&format=json&origin=*`
      );
      if (!resp.ok) throw new Error('Wiki failed');
      const data = await resp.json();
      if (data.query?.geosearch) {
        const hits: PlaceSearchHit[] = data.query.geosearch.slice(0, 10).map((item: any) => ({
          id: `suggest-${item.pageid}`,
          name: item.title,
          location: '',
          coordinates: { lat: item.lat, lng: item.lon },
          type: 'landmark'
        }));
        setSuggestedDiscoveries(hits);
      }
    } catch (e) {
      console.error('Discovery failed', e);
    } finally {
      setIsDiscovering(false);
    }
  }

  useEffect(() => {
    const updateLiveStatus = () => {
      if (!trip || !places.length) return

      const now = new Date()
      // Create a date at midnight in local time for trip start
      const tripStart = new Date(trip.startDate)
      tripStart.setHours(0, 0, 0, 0)
      
      const diffTime = now.getTime() - tripStart.getTime()
      const currentDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
      const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')

      const itinerary = getGlobalItinerary(places)
      
      let foundPlace: string | null = null
      let foundTransport: string | null = null

      for (const item of itinerary) {
        if (item.type === 'place') {
          const startDay = item.data.day || 1
          const endDay = item.data.endDay || startDay
          const arrival = item.data.arrival || '00:00'
          const departure = item.data.departure || '23:59'

          if (currentDay > startDay && currentDay < endDay) {
            foundPlace = item.data.id
            break
          } else if (currentDay === startDay && currentDay === endDay) {
            if (currentTime >= arrival && currentTime <= departure) {
              foundPlace = item.data.id
              break
            }
          } else if (currentDay === startDay) {
            if (currentTime >= arrival) {
              foundPlace = item.data.id
              break
            }
          } else if (currentDay === endDay) {
            if (currentTime <= departure) {
              foundPlace = item.data.id
              break
            }
          }
        } else if (item.type === 'transport') {
          const depDay = item.data.departureDay || 1
          const arrDay = item.data.arrivalDay || depDay
          const depTime = item.data.departure || '00:00'
          const arrTime = item.data.arrival || '23:59'

          if (currentDay > depDay && currentDay < arrDay) {
            foundTransport = item.data.id
            break
          } else if (currentDay === depDay && currentDay === arrDay) {
             if (currentTime >= depTime && currentTime <= arrTime) {
                foundTransport = item.data.id
                break
             }
          } else if (currentDay === depDay) {
             if (currentTime >= depTime) {
                foundTransport = item.data.id
                break
             }
          } else if (currentDay === arrDay) {
             if (currentTime <= arrTime) {
                foundTransport = item.data.id
                break
             }
          }
        }
      }

      setLivePlaceId(foundPlace)
      setLiveTransportId(foundTransport)
    }

    updateLiveStatus()
    const interval = setInterval(updateLiveStatus, 60000)
    return () => clearInterval(interval)
  }, [trip, places])

  const handlePlacePhotoUpload = async (placeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = reader.result as string
      const place = places.find(p => p.id === placeId)
      if (place) {
        const updatedPlace = {
          ...place,
          photos: [...(place.photos || []), base64]
        }
        const newPlaces = [...places]
        const pIdx = newPlaces.findIndex(p => p.id === placeId)
        if (pIdx !== -1) {
          newPlaces[pIdx] = updatedPlace
          setPlaces(newPlaces)
          await updateTripContext({ ...trip!, places: newPlaces })
        }
      }
    }
    reader.readAsDataURL(file)
  }
  
  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`trip_settings_${id}`)
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        if (settings.showPlaces !== undefined) setShowPlaces(settings.showPlaces)
        if (settings.showTransports !== undefined) setShowTransports(settings.showTransports)
        if (settings.showMap !== undefined) setShowMap(settings.showMap)
        if (settings.showAccommodations !== undefined) setShowAccommodations(settings.showAccommodations)
        if (settings.showEvents !== undefined) setShowEvents(settings.showEvents)
        if (settings.showDocuments !== undefined) setShowDocuments(settings.showDocuments)
        if (settings.showLinks !== undefined) setShowLinks(settings.showLinks)
      } catch (e) {
        console.error('Failed to parse trip settings', e)
      }
    }
  }, [id])

  // Save settings to localStorage when they change
  useEffect(() => {
    const settings = {
      showPlaces,
      showTransports,
      showMap,
      showAccommodations,
      showEvents,
      showDocuments,
      showLinks
    }
    localStorage.setItem(`trip_settings_${id}`, JSON.stringify(settings))
  }, [showPlaces, showTransports, showMap, showAccommodations, showEvents, showDocuments, showLinks, id])
  
  const editModalScrollRef = useRef<HTMLDivElement>(null)
  
  // Attachments modal state
  const [isAttachmentsModalOpen, setIsAttachmentsModalOpen] = useState(false)
  const [attachmentsPlaceId, setAttachmentsPlaceId] = useState<string | null>(null)
  const [attachmentNoteText, setAttachmentNoteText] = useState('')
  const [attachmentDocTitle, setAttachmentDocTitle] = useState('')
  const [attachmentDocUrl, setAttachmentDocUrl] = useState('')
  const [attachmentLinkTitle, setAttachmentLinkTitle] = useState('')
  const [attachmentLinkUrl, setAttachmentLinkUrl] = useState('')

  // Focused attachment type modal (add new)
  const [activeAttachmentType, setActiveAttachmentType] = useState<AttachmentType | null>(null)
  const [activeAttachmentPlaceId, setActiveAttachmentPlaceId] = useState<string | null>(null)
  const [activeAttachmentDefaultDay, setActiveAttachmentDefaultDay] = useState<number | null>(null)
  const [triggeredLiveHighlightId, setTriggeredLiveHighlightId] = useState<string | null>(null)

  // Attachment detail modal (view/edit existing)
  const [attachmentDetail, setAttachmentDetail] = useState<{ data: AttachmentDetailData; placeId: string } | null>(null)

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
        formattedDate: formatDateShort(currentDate),
        places: places.filter(place => {
          const start = place.day || 1
          const end = place.endDay || start
          return dayNumber >= start && dayNumber <= end
        })
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
      dayNumber++
    }
    
    return days
  }

  const allDays = getAllDaysInTrip()


  const getNextPlaceInItinerary = (dayNumber: number, idx: number) => {
    const day = allDays.find((d) => d.dayNumber === dayNumber)
    if (!day) return null
    if (idx < day.places.length - 1) return day.places[idx + 1]
    const nextDay = allDays.find((d) => d.dayNumber > dayNumber && d.places.length > 0)
    return nextDay?.places?.[0] ?? null
  }

  // Helper function to migrate places to ensure they have required arrays
  const migratePlaces = (places: Place[]): Place[] => {
    return places.map(place => ({
      ...place,
      events: place.events || [],
      documents: place.documents || [],
      links: place.links || []
    }))
  }

  const handleEditSubmit = async (data: {
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
    await updateTripContext(updatedTrip)
    
    // Update local state
    setTrip(updatedTrip)
    setIsEditModalOpen(false)
    setIsEditSubmitting(false)
    setPreviewWallpaper(null)
  }

  const searchEditWallpapers = async (query: string) => {
    // Dummy function - TripForm handles wallpaper search internally
  }


  const deleteTransportLeg = () => {
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
  const [placeModalMode, setPlaceModalMode] = useState<'add' | 'edit'>('add')
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [eventPlaceId, setEventPlaceId] = useState<string>('')
  const [eventTitle, setEventTitle] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventDay, setEventDay] = useState<number>(1)
  const [eventEndDay, setEventEndDay] = useState<number>(1)
  const [eventTime, setEventTime] = useState('')
  const [eventEndTime, setEventEndTime] = useState('')

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

      let apiUrl = `/api/places/search?q=${encodeURIComponent(q)}`
      if (mapViewport?.center) {
        apiUrl += `&lat=${mapViewport.center.lat}&lon=${mapViewport.center.lng}`
      }

      fetch(apiUrl, { signal: ac.signal })
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

  const savePlacesToTrip = async (updatedPlaces: Place[]) => {
    if (trip) {
      const updatedTrip = { ...trip, places: updatedPlaces }
      await updateTripContext(updatedTrip)
      setTrip(updatedTrip)
    }
  }



  const resetPlaceModal = () => {
    searchAbortRef.current?.abort()
    setIsPlaceSearchOpen(false)
    
    setSearchQuery('')
    setSearchResults([])
    setSearchError(null)
    setSelectedSearchResult(null)
    setManualPlaceName('')
    setManualPlaceLocation('')
    setManualPlaceCountry('')
    setNewPlaceDay(Math.max(1, places.length + 1))
    setNewPlaceEndDay(Math.max(1, places.length + 1))
    setNewPlacePhotos([])
    setMapsUrlInput('')
    setMapPreviewCoords(null)
    setPlaceInputMode('search')
    setMobileStep(1)
    setSuggestedDiscoveries([])
  }

  const handleOpenAddPlace = () => {
    setIsPlaceSearchOpen(true)
    fetchDiscoveries()
  }


  const deletePlace = async (placeId: string) => {
    if (!trip) return
    if (confirm('Are you sure you want to delete this place?')) {
      await removePlace(trip.id, placeId)
      const updatedTrips = await loadTrips()
      const found = updatedTrips.find(t => t.id === id)
      if (found) {
        setTrip(found)
        setPlaces(migratePlaces(found.places || []))
      }
      setFocusedPlaceId(null)
      setIsPlaceDetailModalOpen(false)
      setEditingPlaceForDetail(null)
      resetPlaceModal()
    }
  }



  const openEventModal = (placeId: string) => {
    setEventPlaceId(placeId)
    setIsEventModalOpen(true)
    const place = places.find(p => p.id === placeId)
    if (place) {
      setEventDay(place.day || 1)
      setEventEndDay(place.day || 1)
      if (trip && trip.startDate) {
        const placeDate = new Date(trip.startDate)
        placeDate.setDate(placeDate.getDate() + (place.day || 1) - 1)
        setEventDate(placeDate.toISOString().split('T')[0])
      }
    }
  }

  const saveEvent = () => {
    if (!eventTitle.trim() || !eventPlaceId) return

    const newEvent: TripEvent = {
      id: Date.now().toString(),
      title: eventTitle.trim(),
      description: eventDescription.trim(),
      date: trip?.startDate || '',
      day: eventDay,
      endDay: eventEndDay || eventDay,
      ...(eventTime && { time: eventTime }),
      ...(eventEndTime && { endTime: eventEndTime }),
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
    setEventEndTime('')
  }

  // Apply a fully-formed transport leg (called by TransportDetailModal onSave)
  const applyTransportLeg = (leg: Transport) => {
    if (!transportToPlaceId) return
    const fromPlaceId = transportBetweenIndex === -1 ? 'home'
      : typeof transportBetweenIndex === 'number' ? (places[transportBetweenIndex]?.id ?? '') : ''
    if (!fromPlaceId) return
    // Ensure from/to are set correctly
    const finalLeg: Transport = { ...leg, from: fromPlaceId, to: transportToPlaceId }

    if (fromPlaceId === 'home') {
      const firstPlace = places[0]
      if (!firstPlace) return
      const prev = firstPlace.transport?.filter((t) => t.id !== editingTransportLegId) ?? []
      const updatedPlaces = places.map((p) =>
        p.id === firstPlace.id ? { ...p, transport: [...prev, finalLeg] } : p,
      )
      setPlaces(updatedPlaces)
      savePlacesToTrip(updatedPlaces)
    } else if (transportBetweenIndex !== null) {
      const fromPlace = places[transportBetweenIndex]
      if (!fromPlace) return
      const prev = fromPlace.transport?.filter((t) => t.id !== editingTransportLegId) ?? []
      const updatedPlaces = places.map((p) =>
        p.id === fromPlace.id ? { ...p, transport: [...prev, finalLeg] } : p,
      )
      setPlaces(updatedPlaces)
      savePlacesToTrip(updatedPlaces)
    }
    closeTransportModal()
  }

  const closeTransportModal = () => {
    setIsTransportModalOpen(false)
    setEditingTransportLegId(null)
    setTransportBetweenIndex(null)
    setTransportToPlaceId(null)
  }

  const openTransportModal = (placeIndex: number, position: 'before' | 'after', legId?: string, defaultDay?: number) => {
    setTransportLegDefaultDay(defaultDay ?? null)
    const fromPlaceId = position === 'before' ? (placeIndex === 0 ? 'home' : places[placeIndex - 1].id) : places[placeIndex].id
    const toPlaceId = position === 'after' ? (placeIndex === places.length - 1 ? 'home' : places[placeIndex + 1].id) : places[placeIndex].id
    const idx = position === 'before' ? placeIndex - 1 : placeIndex
    setTransportBetweenIndex(idx)
    setTransportToPlaceId(toPlaceId)

    const fromPlace = fromPlaceId === 'home' ? (places[0] || null) : places.find(p => p.id === fromPlaceId)
    
    // Bounds Calculation
    const queue = getGlobalItinerary({ ...trip, places })
    let currentIndex = -1
    if (legId) {
      currentIndex = queue.findIndex(item => item.type === 'transport' && item.data.id === legId)
    } else {
      // Find the gap where we are inserting
      if (position === 'before') {
        const placeIdx = queue.findIndex(item => item.type === 'place' && item.globalIndex === placeIndex)
        currentIndex = placeIdx // Inbound legs go before the place
      } else {
        const placeIdx = queue.findIndex(item => item.type === 'place' && item.globalIndex === placeIndex)
        // Count how many transports already exist in this gap
        const existingGapTransports = (places[placeIndex]?.transport || []).filter(t => t.to === toPlaceId).length
        currentIndex = placeIdx + existingGapTransports + 1
      }
    }

    const bounds = getItemBounds(queue, currentIndex, !legId)
    setTransportMinDay(bounds.minDay)
    setTransportMinTime(bounds.minTime)
    setTransportMaxDay(bounds.maxDay)
    setTransportMaxTime(bounds.maxTime)

    const existing = legId ? fromPlace?.transport?.find((t) => t.id === legId) : null
    
    if (existing) {
      setEditingTransportLegId(existing.id)
      setSelectedTransportMode(normalizeTransportMode(existing.type))
      setTransportLegTitle(existing.title || '')
      setTransportLegDeparture(existing.departure || '')
      setTransportLegArrival(existing.arrival || '')
      setTransportLegDuration(existing.duration || '')
      setTransportLegDocuments(existing.documents || [])
    } else {
      setEditingTransportLegId(null)
      setSelectedTransportMode(null)
      setTransportLegTitle('')
      
      let defaultTime = bounds.minTime || '10:00';
      
      // If we are adding after a place, we can try to be even smarter
      if (fromPlace && position === 'after') {
        const p = fromPlace as Place;
        // Priority: Last event endTime, then Last accommodation checkOut, then Place departure
        if (p.events?.length > 0) {
          const sorted = [...p.events].sort((a,b) => (b.endTime || b.time || '').localeCompare(a.endTime || a.time || ''))
          defaultTime = sorted[0].endTime || sorted[0].time || defaultTime
        }
      }
      
      setTransportLegDeparture(defaultTime)
      
      let defaultArrival = bounds.maxTime || '';
      if (!defaultArrival && defaultTime) {
        const [h, m] = defaultTime.split(':').map(Number)
        defaultArrival = `${((h + 1) % 24).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      }
      setTransportLegArrival(defaultArrival)
      setTransportLegDuration('')
      setTransportLegDocuments([])
    }
    setIsTransportModalOpen(true)
  }


  useEffect(() => {
    loadTrips().then(trips => {
      const found = trips.find(t => t.id === id)
      if (found) {
        setTrip(found)
        // Load places from trip data and migrate to ensure required arrays exist
        const loadedPlaces = migratePlaces(found.places || [])
        setPlaces(loadedPlaces)
        
        // If no places exist, default to Edit mode
        if (loadedPlaces.length === 0) {
          setIsEditMode(true)
        }
      }
    })
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
        setEditingPlaceForDetail(place)
        setPlaceDetailInitialDay(place.day || 1)
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
    const hasModalOpen = isPlaceSearchOpen || isEventModalOpen || isTransportModalOpen || isEditModalOpen || isAttachmentsModalOpen || isEmojiPickerInForm || isWallpaperPickerInForm || isViewSettingsOpen
    
    // Find navigation elements
    const hamburgerButton = document.querySelector('.fixed.z-60') as HTMLElement
    const topHeader = document.querySelector('.fixed.z-50') as HTMLElement
    
    if (hamburgerButton) {
      hamburgerButton.style.display = hasModalOpen ? 'none' : ''
    }
    if (topHeader) {
      topHeader.style.display = hasModalOpen ? 'none' : ''
    }
  }, [isPlaceSearchOpen, isEventModalOpen, isTransportModalOpen, isEditModalOpen, isAttachmentsModalOpen, isEmojiPickerInForm, isWallpaperPickerInForm, isViewSettingsOpen])

  const [currentTime, setCurrentTime] = useState(new Date())

  // Auto-update time every 30 seconds for live indicators
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  // Consistently find the "Live" place across the component
  const findLivePlace = () => {
    if (!trip || !trip.startDate) return null;
    const startParts = trip.startDate.split('-').map(Number);
    const startObj = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    const todayObj = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
    const day = Math.floor((todayObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Find the current day data
    const dayData = allDays.find(d => d.dayNumber === day);
    if (!dayData) return { day };

    // 1. Check for live transport first
    if (dayData.transport && dayData.transport.length > 0) {
      const activeTransport = dayData.transport.find(t => {
        if (!t.departure || !t.arrival) return false;
        const [dh, dm] = t.departure.split(':').map(Number);
        const [ah, am] = t.arrival.split(':').map(Number);
        const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
        const depMins = dh * 60 + dm;
        const arrMins = ah * 60 + am;

        // Simple case: same day travel
        if (t.arrivalDay === t.departureDay || !t.arrivalDay) {
          return nowMins >= depMins && nowMins <= arrMins;
        }
        
        // Multi-day travel
        if (day === t.departureDay) return nowMins >= depMins;
        if (day === t.arrivalDay) return nowMins <= arrMins;
        if (day > (t.departureDay || 0) && day < (t.arrivalDay || 0)) return true;
        
        return false;
      });
      
      if (activeTransport) {
        return { day, transportId: activeTransport.id };
      }
    }

    // 2. Check for live place
    const nowTimeMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    const activePlace = dayData.places.find(p => {
      if (!p.arrival || !p.departure) return false;
      const [ah, am] = p.arrival.split(':').map(Number);
      const [dh, dm] = p.departure.split(':').map(Number);
      const arrMins = ah * 60 + am;
      const depMins = dh * 60 + dm;
      return nowTimeMins >= arrMins && nowTimeMins <= depMins;
    }) || dayData.places[0];

    return { day, placeId: `day-${day}-place-${activePlace ? activePlace.id : ''}` };
  };

  // Robust Scroll-to Handler with polling
  useEffect(() => {
    const scrollId = searchParams.get('scrollTo')
    if (scrollId) {
      let attempts = 0;
      const maxAttempts = 20; // 5 seconds total (250ms * 20)
      
      const pollTimer = setInterval(() => {
        const element = document.getElementById(scrollId)
        if (element) {
          clearInterval(pollTimer);
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Trigger the animated highlight if it's a live scroll
            if (scrollId.startsWith('day-')) {
              const parts = scrollId.split('-place-');
              if (parts.length === 2) {
                const dayNum = parts[0].replace('day-', '');
                setTriggeredLiveHighlightId(`${dayNum}-${parts[1]}`);
                setTimeout(() => setTriggeredLiveHighlightId(null), 3000);
              }
            }

            // Elegant two-pulse glow animation instead of abrupt ring flash
            element.animate(
              [
                { boxShadow: '0 0 0px 0px rgba(143,244,255,0)', outline: '2px solid rgba(143,244,255,0)', outlineOffset: '0px' },
                { boxShadow: '0 0 30px 8px rgba(143,244,255,0.35)', outline: '2px solid rgba(143,244,255,0.7)', outlineOffset: '4px' },
                { boxShadow: '0 0 10px 2px rgba(143,244,255,0.12)', outline: '2px solid rgba(143,244,255,0.25)', outlineOffset: '2px' },
                { boxShadow: '0 0 24px 6px rgba(143,244,255,0.22)', outline: '2px solid rgba(143,244,255,0.45)', outlineOffset: '4px' },
                { boxShadow: '0 0 0px 0px rgba(143,244,255,0)', outline: '2px solid rgba(143,244,255,0)', outlineOffset: '0px' },
              ],
              { duration: 2600, easing: 'ease-in-out', fill: 'forwards' }
            );
          }, 200);
        }
        
        attempts++;
        if (attempts >= maxAttempts) clearInterval(pollTimer);
      }, 250);
      
      return () => clearInterval(pollTimer);
    }
  }, [searchParams, trip]);

  if (!trip) {
    return (
      <div className="min-h-screen bg-background text-on-surface font-body flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-neutral-600 mb-4 text-primary animate-pulse">flight_takeoff</span>
          <p className="text-neutral-500 font-bold uppercase tracking-widest text-sm">Initializing Trip...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-background text-on-surface font-body">
      {(previewWallpaper || trip?.wallpaper) && (
        <ParallaxBackground 
          src={previewWallpaper || trip.wallpaper} 
          opacity={wallpaperOpacity} 
          parallaxFactor={0.2}
        />
      )}
      <AppHeader 
        onBack={() => router.push('/')}
        className={isScrolled ? 'bg-neutral-900/80 border-b border-white/10 transition-all duration-300' : 'transition-all duration-300'}
        left={isScrolled ? (
          <div className="flex items-center gap-1.5 sm:gap-2 max-w-[120px] xs:max-w-[200px] sm:max-w-md animate-in slide-in-from-left duration-500 overflow-hidden">
            <span className="text-base sm:text-lg shrink-0">{trip.emoji}</span>
            <div className="flex flex-col leading-tight min-w-0">
              <h2 className="text-[11px] sm:text-sm font-black text-white truncate shadow-sm group-hover:text-primary transition-colors">{trip.title}</h2>
              <p className="text-[8px] sm:text-[10px] text-neutral-400 font-bold truncate opacity-80">{formatDuration(trip.startDate, trip.endDate)}</p>
            </div>
          </div>
        ) : undefined}
        extraRight={
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Always visible on mobile in header, only visible when scrolled on desktop */}
            <div className={`${isScrolled ? 'flex' : 'flex sm:hidden'} items-center gap-1.5 sm:gap-2 ${isScrolled ? 'animate-in slide-in-from-right duration-500' : ''}`}>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 border border-white/20 text-white hover:bg-primary hover:text-black transition-all active:scale-90"
                title="Share Trip"
              >
                <span className="material-symbols-outlined text-sm sm:text-[20px]">share</span>
              </button>
              {!isEditMode && (
                <button
                  type="button"
                  disabled={itineraryViewMode === 'table'}
                  onClick={(e) => { e.stopPropagation(); setIsViewSettingsOpen(true); }}
                  className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 border border-white/20 text-white hover:bg-primary hover:text-black transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="View Settings"
                >
                  <span className="material-symbols-outlined text-sm sm:text-[20px]">settings</span>
                </button>
              )}
              <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-0.5 sm:p-1">
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  className={`rounded-full px-2 sm:px-3 py-1 text-[9px] sm:text-xs font-bold transition-all ${!isEditMode ? 'bg-white text-slate-950' : 'text-neutral-400 hover:text-white'}`}
                >
                  Trip
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className={`rounded-full px-2 sm:px-3 py-1 text-[9px] sm:text-xs font-bold transition-all ${isEditMode ? 'bg-primary text-slate-950' : 'text-neutral-400 hover:text-white'}`}
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        }
      />



      {/* Main Content */}
      <main className="relative z-10 min-h-screen pt-24 pb-32 px-4 sm:px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          {/* Trip Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-3xl border border-white/20 shadow-inner">
                {trip.emoji}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-4xl font-bold font-headline text-white">{trip.title}</h1>
                  {isEditMode && (
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      title="Edit trip details"
                    >
                      <span className="material-symbols-outlined text-white text-base">edit</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-neutral-400 font-medium tracking-wide">
                  <span className="material-symbols-outlined text-base opacity-70">calendar_month</span>
                  <p>{formatDuration(trip.startDate, trip.endDate)}</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-white/10 border border-white/20 text-white hover:bg-primary hover:text-black hover:border-primary transition-all duration-300 shadow-lg active:scale-90"
                  title="Share Trip"
                >
                  <span className="material-symbols-outlined text-[20px]">share</span>
                </button>
                {!isEditMode && (
                  <button
                    type="button"
                    disabled={itineraryViewMode === 'table'}
                    onClick={(e) => { e.stopPropagation(); setIsViewSettingsOpen(true); }}
                    className={`group relative flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-300 shadow-lg active:scale-90 ${
                      itineraryViewMode === 'table' 
                        ? 'bg-white/5 border-white/5 text-neutral-600 cursor-not-allowed opacity-50' 
                        : 'bg-white/10 border-white/20 text-white hover:bg-primary hover:text-black hover:border-primary'
                    }`}
                    title={itineraryViewMode === 'table' ? "Filter using table controls" : "View Settings"}
                  >
                    <span className={`material-symbols-outlined text-[20px] ${itineraryViewMode === 'table' ? '' : 'group-hover:rotate-90 transition-transform duration-500'}`}>settings</span>
                  </button>
                )}
                <div className="inline-flex overflow-hidden rounded-full border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${!isEditMode ? 'bg-white text-slate-950' : 'text-neutral-400 hover:text-white'}`}
                >
                  Trip
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${isEditMode ? 'bg-primary/90 text-slate-950' : 'text-neutral-400 hover:text-white'}`}
                >
                  Edit
                </button>
                </div>
              </div>
            </div>
            {trip.description && (
              <p className="text-neutral-300 text-lg">{trip.description}</p>
            )}
          </div>

          {/* Three Main Sections */}
          <div className={`${showMap ? "grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-start" : "max-w-3xl mx-auto w-full"} transition-all duration-500 min-w-0`}>
            {/* Section 1: Unified Timeline */}
            <div className="min-w-0 overflow-hidden">
              <div className="bg-neutral-900/30 backdrop-blur-xl border border-white/10 rounded-3xl animate-in slide-in-from-left-4 duration-500 shadow-2xl overflow-hidden" id="itinerary-card">
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white font-headline flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-xl">timeline</span>
                      Itinerary
                    </h2>
                    <p className="text-neutral-500 text-sm mt-1">Plan your journey day by day</p>
                  </div>

                    <div className="flex items-center gap-2">
                      {/* View Switcher */}
                      <div className="inline-flex overflow-hidden rounded-full border border-white/10 bg-black/40 backdrop-blur-md p-0.5">
                        <button
                          type="button"
                          onClick={() => setItineraryViewMode('timeline')}
                          className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] transition-all duration-500 ease-out h-[22px] ${
                            itineraryViewMode === 'timeline' 
                              ? 'bg-primary text-slate-950 shadow-[0_0_15px_rgba(143,245,255,0.3)] scale-100' 
                              : 'text-neutral-500 hover:text-white scale-95'
                          }`}
                          title="Timeline View"
                        >
                          <span className="material-symbols-outlined text-xs">timeline</span>
                        <span className={`overflow-hidden transition-all duration-500 ease-out ${itineraryViewMode === 'timeline' ? 'max-w-[80px] opacity-100' : 'max-w-0 opacity-0'}`}>
                          Timeline
                        </span>
                      </button>
                        <button
                          type="button"
                          onClick={() => setItineraryViewMode('table')}
                          className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] transition-all duration-500 ease-out h-[22px] ${
                            itineraryViewMode === 'table' 
                              ? 'bg-primary text-slate-950 shadow-[0_0_15px_rgba(143,245,255,0.3)] scale-100' 
                              : 'text-neutral-500 hover:text-white scale-95'
                          }`}
                          title="Table View"
                        >
                          <span className="material-symbols-outlined text-xs">table_rows</span>
                        <span className={`overflow-hidden transition-all duration-500 ease-out ${itineraryViewMode === 'table' ? 'max-w-[80px] opacity-100' : 'max-w-0 opacity-0'}`}>
                          Table
                        </span>
                      </button>
                    </div>

                    {trip.startDate && trip.places.length > 0 && (() => {
                    const start = new Date(trip.startDate);
                    const now = new Date();
                    const day = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    const isWithinTrip = day > 0 && day <= allDays.length;
                    
                    if (!isWithinTrip) return null;
                    
                    return (
                      <button 
                        onClick={() => {
                          const liveInfo = findLivePlace();
                          if (liveInfo && liveInfo.placeId) {
                            const element = document.getElementById(liveInfo.placeId);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              
                              // Trigger the animated highlight
                              setTriggeredLiveHighlightId(liveInfo.placeId.replace(`day-${liveInfo.day}-place-`, `${liveInfo.day}-`));
                              setTimeout(() => setTriggeredLiveHighlightId(null), 3000);

                              element.animate(
                                [
                                  { boxShadow: '0 0 0px 0px rgba(143,244,255,0)', outline: '2px solid rgba(143,244,255,0)', outlineOffset: '0px' },
                                  { boxShadow: '0 0 30px 8px rgba(143,244,255,0.35)', outline: '2px solid rgba(143,244,255,0.7)', outlineOffset: '4px' },
                                  { boxShadow: '0 0 10px 2px rgba(143,244,255,0.15)', outline: '2px solid rgba(143,244,255,0.3)', outlineOffset: '2px' },
                                  { boxShadow: '0 0 30px 8px rgba(143,244,255,0.25)', outline: '2px solid rgba(143,244,255,0.5)', outlineOffset: '4px' },
                                  { boxShadow: '0 0 0px 0px rgba(143,244,255,0)', outline: '2px solid rgba(143,244,255,0)', outlineOffset: '0px' },
                                ],
                                { duration: 2400, easing: 'ease-in-out', iterations: 1, fill: 'forwards' }
                              );
                            }
                          } else if (liveInfo && liveInfo.day) {
                             const element = document.getElementById(`day-${liveInfo.day}`);
                             if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }}
                        className="flex items-center gap-1.5 px-2 py-0.5 bg-primary rounded-full hover:bg-white transition-all group shadow-[0_0_15px_rgba(143,244,255,0.4)] active:scale-95 h-[23px]"
                      >
                         <div className="w-1 h-1 bg-slate-950 rounded-full animate-pulse"></div>
                         <span className="text-[9px] font-black text-slate-950 uppercase tracking-[0.1em] leading-none">Live</span>
                      </button>
                    );
                  })()}
                  </div>
                </div>

                <div className="p-4 md:p-8 space-y-8 relative" id="itinerary-content">
                  {trip.places.length === 0 ? (
                    <div className="text-center py-12">
                      <span className="material-symbols-outlined text-6xl text-neutral-600 mb-4">location_on</span>
                      <h3 className="text-xl font-bold text-white mb-2">No places added yet</h3>
                      <p className="text-neutral-400 mb-4">Start building your itinerary by adding your first place</p>
                      {isEditMode ? (
                        <button
                          onClick={() => handleOpenAddPlace()}
                          className="w-full bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 flex items-center justify-center gap-2 hover:bg-primary/20 hover:border-primary/60 transition-all text-primary font-semibold group active:scale-95 duration-150"
                        >
                          <span className="material-symbols-outlined text-lg">add_circle</span>
                          <span className="text-sm font-bold uppercase tracking-wider">Add your first place</span>
                        </button>
                      ) : (
                        <p className="text-neutral-400 text-sm">Switch to edit mode to add your first place.</p>
                      )}
                    </div>
                  ) : itineraryViewMode === 'table' ? (
                    <ItineraryTable 
                      trip={trip} 
                      onItemClick={(type, id, data) => {
                        if (type === 'place') {
                          setEditingPlaceForDetail(data);
                          setIsPlaceDetailModalOpen(true);
                        } else if (type === 'transport') {
                          setEditingTransportLegId(id);
                          // Needs to find placeId for transport
                          const place = places.find(p => p.transport?.some(t => t.id === id));
                          if (place) {
                            setIsTransportModalOpen(true);
                          }
                        } else if (type === 'attachment') {
                          setAttachmentDetail({
                            data: { 
                              type: data.type,
                              [data.type]: data 
                            },
                            placeId: data.parentPlaceId
                          });
                        }
                      }}
                    />
                  ) : (
                    <div className="space-y-6">
                      {allDays.map((day, dayIndex) => (
                        <div key={day.dayNumber} id={`day-${day.dayNumber}`} className="relative ml-[15px] transition-all duration-700 rounded-2xl p-2 -m-2">
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
                                  {isEditMode ? (
                                  <button
                                    onClick={() => {
                                      setNewPlaceDay(day.dayNumber)
                                      handleOpenAddPlace()
                                    }}
                                    className="text-primary hover:text-primary/80 font-medium text-sm underline"
                                  >
                                    Add your first place
                                  </button>
                                ) : (
                                  <p className="text-neutral-500 text-sm">Switch to edit mode to add a place here.</p>
                                )}
                                </div>
                              </div>
                            ) : (
                              <>
                                {day.places.map((place, placeIndex) => {
                                  const globalPlaceIndex = places.findIndex(p => p.id === place.id)
                                  const nextPlace = placeIndex < day.places.length - 1
                                    ? day.places[placeIndex + 1]
                                    : allDays.find((d) => d.dayNumber > day.dayNumber && d.places.length > 0)?.places?.[0] || null
                                  const isLastInDay = placeIndex === day.places.length - 1;

                                  // Refined robust absolute Live logic using auto-updating time
                                  const startParts = trip.startDate.split('-').map(Number);
                                  const startObj = new Date(startParts[0], startParts[1] - 1, startParts[2]);
                                  const todayObj = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
                                  
                                  const diffTime = todayObj.getTime() - startObj.getTime();
                                  const currentTripDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                  
                                  const nowTimeMins = currentTime.getHours() * 60 + currentTime.getMinutes();
                                  const isCurrentDay = day.dayNumber === currentTripDay;
                                  
                                  const activeByTimePlace = day.places.find(p => {
                                    if (!p.arrival || !p.departure) return false;
                                    const [ah, am] = p.arrival.split(':').map(Number);
                                    const [dh, dm] = p.departure.split(':').map(Number);
                                    return nowTimeMins >= (ah * 60 + am) && nowTimeMins <= (dh * 60 + dm);
                                  });

                                  const upcomingToday = day.places.find(p => {
                                    if (!p.arrival) return true;
                                    const [ah, am] = p.arrival.split(':').map(Number);
                                    return (ah * 60 + am) > nowTimeMins;
                                  }) || day.places[0];

                                  const isLiveBase = isCurrentDay && (
                                    (activeByTimePlace ? activeByTimePlace.id === place.id : upcomingToday?.id === place.id)
                                  );
                                  
                                  const isLiveHighlight = triggeredLiveHighlightId === `${day.dayNumber}-${place.id}`;

                                  // Helper to check if a transport leg is currently active
                                  const getTransportLiveStatus = (leg: Transport) => {
                                    if (!isCurrentDay) return false;
                                    if (!leg.departure || !leg.arrival) return false;
                                    
                                    const depDay = leg.departureDay || place.day || 1;
                                    const arrDay = leg.arrivalDay || place.endDay || place.day || 1;
                                    
                                    if (day.dayNumber < depDay || day.dayNumber > arrDay) return false;
                                    
                                    const [dh, dm] = leg.departure.split(':').map(Number);
                                    const [ah, am] = leg.arrival.split(':').map(Number);
                                    const depMins = dh * 60 + dm;
                                    const arrMins = ah * 60 + am;
                                    
                                    if (day.dayNumber === depDay && day.dayNumber === arrDay) {
                                      return nowTimeMins >= depMins && nowTimeMins <= arrMins;
                                    } else if (day.dayNumber === depDay) {
                                      return nowTimeMins >= depMins;
                                    } else if (day.dayNumber === arrDay) {
                                      return nowTimeMins <= arrMins;
                                    } else {
                                      return true; // Mid-day of a multi-day trip
                                    }
                                  };

                                  return (
                                    <div key={`${day.dayNumber}-${place.id}`} id={`day-${day.dayNumber}-place-${place.id}`} className="relative flex flex-col mb-1 rounded-2xl">
                                      
                                      {/* Inbound Connection Section */}
                                      {(() => {
                                        // Only show at the start of the stay
                                        if (day.dayNumber !== (place.day || 1)) return null
                                        
                                        const fromId = globalPlaceIndex === 0 ? 'home' : (places[globalPlaceIndex - 1]?.id ?? 'home')
                                        const legs = (globalPlaceIndex === 0 ? place : places[globalPlaceIndex - 1]).transport?.filter(t => t.to === place.id && t.from === fromId)
                                          .sort((a,b) => (a.departureDay || 1) - (b.departureDay || 1) || (a.departure || '').localeCompare(b.departure || '')) || []
                                        
                                        if (legs.length === 0 && !isEditMode) return null
                                        const shouldShowSection = showTransports || isEditMode;
                                        if (!shouldShowSection && legs.length === 0) return null;

                                        return (
                                          <div className="space-y-1 mb-2">
                                            {legs.map((leg, lIdx) => {
                                              const modeIcon = transportModeIcon(leg.type)
                                              const isInboundLive = getTransportLiveStatus(leg)
                                              const hasDocs = (leg.documents?.length ?? 0) > 0

                                              return (
                                                <div key={leg.id} className={`flex items-start gap-4 ${isInboundLive ? 'relative' : ''}`}>
                                                  <div className="relative w-[50px] shrink-0 flex flex-col items-end py-1">
                                                    <div className={`w-px h-full min-h-[24px] ${isInboundLive ? 'bg-primary/40' : 'bg-white/20'} absolute right-[19px]`}></div>
                                                  </div>
                                                  <div className="flex-1 flex items-center gap-2">
                                                    <button
                                                      onClick={() => openTransportModal(globalPlaceIndex, 'before', leg.id, day.dayNumber)}
                                                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg transition text-xs font-medium ${hasDocs ? 'py-2 px-3' : 'py-1'} ${
                                                        isInboundLive ? 'bg-primary/20 border-primary ring-1 ring-primary/30 shadow-[0_0_15px_rgba(195,244,0,0.15)]' : 'bg-primary/10 border-primary/30'
                                                      } border text-white hover:bg-primary/20 cursor-pointer`}
                                                      title="Edit transport leg"
                                                    >
                                                       <div className="flex items-center gap-2">
                                                         {(leg.departure || (leg.arrivalDay && leg.departureDay && leg.arrivalDay > leg.departureDay)) && (
                                                           <span className="text-neutral-400 font-mono text-[10px] flex items-center gap-0.5">
                                                             {leg.arrivalDay && leg.departureDay && leg.arrivalDay > leg.departureDay && (
                                                               <span className="text-primary/70 font-bold mr-0.5">D{leg.departureDay}</span>
                                                              )}
                                                             {leg.departure || '—'}
                                                           </span>
                                                          )}
                                                         <span className="material-symbols-outlined text-sm text-primary">{modeIcon}</span>
                                                         <span className="text-white text-[11px] font-medium truncate max-w-[120px]">{leg.title || transportModeLabel(leg.type)}</span>
                                                         {(leg.arrival || (leg.arrivalDay && leg.departureDay && leg.arrivalDay > leg.departureDay)) && (
                                                           <span className="text-neutral-400 font-mono text-[10px] flex items-center gap-0.5">
                                                             {leg.arrivalDay && leg.departureDay && leg.arrivalDay > leg.departureDay && (
                                                               <span className="text-primary/70 font-bold mr-0.5">D{leg.arrivalDay}</span>
                                                              )}
                                                             {leg.arrival || '—'}
                                                           </span>
                                                          )}
                                                       </div>
                                                    </button>
                                                    {isEditMode && lIdx === legs.length - 1 && (
                                                      <button 
                                                        onClick={() => openTransportModal(globalPlaceIndex, 'before', undefined, day.dayNumber)}
                                                        className="w-8 h-8 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-neutral-500 hover:text-primary hover:border-primary/50 transition-all active:scale-90"
                                                        title="Add another leg"
                                                      >
                                                        <span className="material-symbols-outlined text-sm">add</span>
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                              )
                                            })}
                                            {legs.length === 0 && isEditMode && (
                                              <div className="flex items-start gap-4">
                                                <div className="relative w-[50px] shrink-0 flex flex-col items-end py-1">
                                                  <div className="w-px h-full min-h-[24px] bg-white/20 absolute right-[19px]"></div>
                                                </div>
                                                <div className="flex-1">
                                                  <button
                                                    onClick={() => openTransportModal(globalPlaceIndex, 'before', undefined, day.dayNumber)}
                                                    className="w-full flex items-center justify-center gap-2 py-1 rounded-lg transition text-xs font-medium bg-white/5 border border-dashed border-white/15 hover:bg-white/10 text-neutral-500 hover:text-white"
                                                    title="Add transport before"
                                                  >
                                                    <span className="material-symbols-outlined text-sm">add</span>
                                                  </button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })()}

                                      {/* Place Row */}
                                      <div className="relative flex items-start gap-4">
                                        {/* Timeline Section with Times */}
                                        <div className="relative flex flex-col items-center w-[50px] shrink-0 z-10">
                                          {/* Continuous connector line */}
                                          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-white/15 -z-10" />

                                          {/* Dot */}
                                          <div className="relative w-9 h-9 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30 mt-1 shrink-0">
                                            <span className="material-symbols-outlined text-primary text-sm">location_on</span>
                                          </div>

                                          {/* Arr / Dep badge — only if times exist and it's the correct day */}
                                          {((place.arrival && day.dayNumber === (place.day || 1)) || (place.departure && day.dayNumber === (place.endDay || place.day || 1))) && (
                                            <div className="mt-1.5 flex flex-col items-center gap-0.5">
                                              {(place.arrival && day.dayNumber === (place.day || 1)) && (
                                                <div className="flex items-center gap-0.5">
                                                  <span className="text-[8px] text-neutral-500 uppercase font-bold tracking-tighter leading-none">↓</span>
                                                  <span className="text-[10px] font-bold text-white font-mono leading-none">{formatTime12h(place.arrival)}</span>
                                                </div>
                                              )}
                                              {(place.departure && day.dayNumber === (place.endDay || place.day || 1)) && (
                                                <div className="flex items-center gap-0.5">
                                                  <span className="text-[8px] text-neutral-500 uppercase font-bold tracking-tighter leading-none">↑</span>
                                                  <span className="text-[10px] font-bold text-neutral-400 font-mono leading-none">{formatTime12h(place.departure)}</span>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>


                                        {/* Place Card Column */}
                                        <div className="flex-1 flex flex-col gap-1">
                                          {/* Place Card */}
                                          {showPlaces && (
                                            <div className={`w-full backdrop-blur-xl border rounded-xl p-4 transition-all duration-300 group cursor-pointer shadow-lg relative overflow-hidden ${isLiveHighlight ? 'bg-primary/10 border-primary ring-2 ring-primary/40 shadow-[0_0_50px_rgba(195,244,0,0.25)] animate-pulse-subtle' : (isEditMode && isLiveBase) ? 'bg-primary/5 border-primary/50 ring-1 ring-primary/20 shadow-[0_0_30px_rgba(195,244,0,0.15)]' : focusedPlaceId === place.id ? 'bg-neutral-800/40 border-primary ring-1 ring-primary/30' : 'bg-neutral-900/20 border-white/10 hover:bg-neutral-800/30'}`}
                                               onClick={() => {
                                                 setFocusedPlaceId(place.id)
                                                 setEditingPlaceForDetail(place)
                                                 setPlaceDetailInitialDay(day.dayNumber)
                                                 setIsPlaceDetailModalOpen(true)
                                               }}>
                                              {/* LIVE badge - matching dashboard style */}
                                              {isLiveBase && !isEditMode && (
                                                <div className="absolute top-0 right-0 p-2.5 z-10">
                                                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary rounded-full shadow-[0_0_15px_rgba(143,244,255,0.4)] animate-in zoom-in duration-500">
                                                    <div className="w-1.5 h-1.5 bg-slate-950 rounded-full animate-pulse"></div>
                                                    <span className="text-[9px] font-black text-slate-950 uppercase tracking-[0.1em] leading-none">Live</span>
                                                  </div>
                                                </div>
                                              )}
                                              <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                  <h4 className="text-base font-bold text-white group-hover:text-primary transition-colors line-clamp-1 leading-tight">{place.name}</h4>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                  {isLiveBase && isEditMode && (
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/20 border border-primary/30 rounded-full mr-1 animate-in zoom-in duration-300">
                                                      <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
                                                      <span className="text-[8px] font-black text-primary uppercase tracking-[0.1em] leading-none">Live</span>
                                                    </div>
                                                  )}
                                                  {isEditMode && (
                                                    <div className="flex items-center gap-1">
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setEditingPlaceForDetail(place);
                                                          setPlaceDetailInitialDay(day.dayNumber);
                                                          setIsPlaceDetailModalOpen(true);
                                                        }}
                                                        className="shrink-0 p-1.5 rounded-full text-amber-400/40 hover:text-amber-400 hover:bg-amber-400/10 transition-all cursor-pointer active:scale-90 shadow-sm"
                                                        title="Add Note"
                                                      >
                                                        <span className="material-symbols-outlined text-[18px]">sticky_note_2</span>
                                                      </button>
                                                      <label className="shrink-0 p-1.5 rounded-full text-emerald-400/40 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all cursor-pointer active:scale-90 shadow-sm" title="Add Destination Photo">
                                                        <input 
                                                          type="file" 
                                                          accept="image/*" 
                                                          className="hidden" 
                                                          onChange={(e) => handlePlacePhotoUpload(place.id, e)}
                                                        />
                                                        <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                                                      </label>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <p className="text-neutral-500 text-xs line-clamp-1">{place.location}</p>
                                                {(place.endDay && place.endDay > (place.day || 1)) && (
                                                  <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[8px] font-black uppercase tracking-tighter">
                                                    DAY {day.dayNumber - (place.day || 1) + 1} OF {(place.endDay - (place.day || 1) + 1)}
                                                  </span>
                                                )}
                                              </div>
                                                  {Array.isArray(place.notes) && place.notes.find(n => n.day === day.dayNumber && n.text) && (
                                                    <div className="mt-1">
                                                      <p className="text-[11px] text-neutral-400/80 italic leading-relaxed whitespace-pre-wrap">
                                                        {(() => {
                                                          const note = place.notes.find(n => n.day === day.dayNumber)
                                                          const text = note?.text || ''
                                                          return text.length > 500 ? `${text.slice(0, 497)}...` : text
                                                        })()}
                                                      </p>
                                                    </div>
                                                  )}

                                                  {/* Place main photos (Gallery) */}
                                                  {place.photos && place.photos.length > 0 && (day.dayNumber === (place.day || 1)) && (
                                                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1 custom-scrollbar scroll-smooth no-scrollbar">
                                                      {place.photos.map((photo, idx) => (
                                                        <div 
                                                          key={idx} 
                                                          className="relative w-32 h-20 rounded-xl border border-white/10 overflow-hidden shrink-0 group/photo cursor-zoom-in"
                                                          onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            openViewer(place.photos!, idx);
                                                          }}
                                                        >
                                                          <img src={typeof photo === 'string' ? photo : (photo as any)?.src?.large || (photo as any)?.src?.medium} className="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-110" alt="" />
                                                          {isEditMode && (
                                                            <button 
                                                              onClick={(e) => { 
                                                                e.stopPropagation();
                                                                const updatedPhotos = [...place.photos!];
                                                                updatedPhotos.splice(idx, 1);
                                                                const updatedPlace = { ...place, photos: updatedPhotos };
                                                                const newPlaces = [...places];
                                                                const pIdx = newPlaces.findIndex(p => p.id === place.id);
                                                                if (pIdx !== -1) {
                                                                  newPlaces[pIdx] = updatedPlace;
                                                                  setPlaces(newPlaces);
                                                                  updateTrip?.(trip!.id, { places: newPlaces });
                                                                }
                                                              }}
                                                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity hover:bg-red-500"
                                                            >
                                                              <span className="material-symbols-outlined text-[10px]">close</span>
                                                            </button>
                                                          )}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}

                                              <div className={(place.accommodations?.some(acc => {
                                                const checkInDay = acc.checkInDay || place.day || 1
                                                const checkOutDay = acc.checkOutDay || place.endDay || place.day || 1
                                                return day.dayNumber >= checkInDay && day.dayNumber <= checkOutDay
                                              }) && showAccommodations) || (place.events?.length > 0 && showEvents) || (place.documents?.length > 0 && showDocuments) || (place.links?.length > 0 && showLinks) || isEditMode ? "flex flex-col gap-2 mt-2" : ""}>

                                                {place.accommodations?.filter(acc => {
                                                  const checkInDay = acc.checkInDay || place.day || 1
                                                  const checkOutDay = acc.checkOutDay || place.endDay || place.day || 1
                                                  return day.dayNumber >= checkInDay && day.dayNumber <= checkOutDay
                                                }).map(acc => showAccommodations && (
                                                  <div
                                                    key={acc.id}
                                                    className="px-3 py-2.5 rounded-xl border border-yellow-400/20 bg-yellow-400/10 backdrop-blur-md hover:bg-yellow-400/20 transition-all group/item shadow-sm cursor-pointer"
                                                    onClick={(e) => { e.stopPropagation(); setAttachmentDetail({ data: { type: 'accommodation', accommodation: acc }, placeId: place.id }) }}
                                                  >
                                                    <div className="flex items-center gap-3">
                                                      <div className="w-9 h-9 rounded-xl bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center shrink-0 group-hover/item:bg-yellow-400/30 transition-colors">
                                                        <span className="material-symbols-outlined text-yellow-400 text-lg">bed</span>
                                                      </div>
                                                      <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 overflow-hidden mb-0.5">
                                                          <div className="text-yellow-100 text-xs font-bold truncate tracking-tight">{acc.name}</div>
                                                          {acc.type && (
                                                              <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-yellow-400/20 border border-yellow-400/30 text-yellow-400 text-[8px] font-black uppercase tracking-tight">
                                                                {acc.type}
                                                              </span>
                                                          )}
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-wrap text-white/50 text-[10px] font-mono leading-none">
                                                           {(() => {
                                                             const start = acc.checkInDay || place.day || 1
                                                             const end = acc.checkOutDay || place.endDay || place.day || 1
                                                             const spansMultiDays = end > start
                                                             return (
                                                               <>
                                                                 {spansMultiDays && <span className="text-primary font-bold">D{start}</span>}
                                                                 <span>{acc.checkIn}</span>
                                                                 <span className="opacity-30">→</span>
                                                                 {spansMultiDays && <span className="text-primary font-bold">D{end}</span>}
                                                                 <span>{acc.checkOut}</span>
                                                                 {spansMultiDays && (
                                                                   <span className="text-[8px] font-black text-primary bg-primary/10 border border-primary/20 rounded-md px-1 py-0.5 ml-1">
                                                                     {end - start} NIGHTS
                                                                   </span>
                                                                 )}
                                                               </>
                                                             )
                                                           })()}
                                                           {acc.address && (
                                                             <>
                                                               <span className="opacity-30">|</span>
                                                               <span className="flex items-center gap-0.5 truncate max-w-[120px]">
                                                                 <span className="material-symbols-outlined text-[10px] text-yellow-400/40 leading-none">location_on</span>
                                                                 <span className="truncate">{acc.address}</span>
                                                               </span>
                                                             </>
                                                           )}
                                                        </div>
                                                      </div>
                                                      {acc.photos && acc.photos.length > 0 && (
                                                        <div className="flex -space-x-4 shrink-0 transition-all group-hover/item:-space-x-2">
                                                          {acc.photos.slice(0, 2).map((p, i) => (
                                                            <div 
                                                              key={i} 
                                                              className="w-12 h-12 rounded-lg border-2 border-slate-900 bg-neutral-800 overflow-hidden shadow-lg rotate-3 group-hover/item:rotate-0 transition-all"
                                                            >
                                                               <img src={typeof p === 'string' ? p : (p as any)?.src?.medium} className="w-full h-full object-cover" alt="" />
                                                            </div>
                                                          ))}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}

                                                {/* Activities for this place */}
                                                {place.events && place.events.length > 0 && showEvents && (
                                                  <div className="space-y-1.5">
                                                    {place.events
                                                      .filter(event => {
                                                        const start = event.day || (event.date ? null : (place.day || 1));
                                                        const end = event.endDay || start!;
                                                        if (start !== null) return day.dayNumber >= start && day.dayNumber <= end;
                                                        return new Date(event.date!).toISOString().split('T')[0] === day.date.toISOString().split('T')[0];
                                                      })
                                                      .map((event, eventIdx) => (
                                                      <div
                                                        key={eventIdx}
                                                        className="px-3 py-2.5 rounded-xl border border-red-400/20 bg-red-400/10 backdrop-blur-md hover:bg-red-400/20 transition-all group/item shadow-sm cursor-pointer"
                                                        onClick={(e) => { e.stopPropagation(); setAttachmentDetail({ data: { type: 'event', event }, placeId: place.id }) }}
                                                      >
                                                        <div className="flex items-center gap-3">
                                                          <div className="w-9 h-9 rounded-xl bg-red-400/20 border border-red-400/30 flex items-center justify-center shrink-0 group-hover/item:bg-red-400/30 transition-colors">
                                                            <span className="material-symbols-outlined text-red-400 text-lg">flag</span>
                                                          </div>
                                                          <div className="flex-1 min-w-0">
                                                            <div className="text-red-100 text-xs font-bold truncate tracking-tight mb-0.5">{event.title}</div>
                                                            <div className="flex items-center gap-2 flex-wrap text-white/50 text-[10px] font-mono leading-none">
                                                                {(event.time || event.endTime) && (
                                                                  <>
                                                                    {(() => {
                                                                      const start = event.day || place.day || 1
                                                                      const end = event.endDay || event.day || place.day || 1
                                                                      const spansMultiDays = end > start
                                                                      return (
                                                                        <>
                                                                          {spansMultiDays && <span className="text-primary font-bold">D{start}</span>}
                                                                          <span>{formatTime12h(event.time || '')}</span>
                                                                          {event.endTime && (
                                                                            <>
                                                                              <span className="opacity-30">→</span>
                                                                              {spansMultiDays && <span className="text-primary font-bold">D{end}</span>}
                                                                              <span>{formatTime12h(event.endTime)}</span>
                                                                            </>
                                                                          )}
                                                                        </>
                                                                      )
                                                                    })()}
                                                                  </>
                                                                )}
                                                                {event.location && (
                                                                  <>
                                                                    {(event.time || event.endTime) && <span className="opacity-30">|</span>}
                                                                    <span className="flex items-center gap-0.5 truncate max-w-[120px]">
                                                                      <span className="material-symbols-outlined text-[10px] text-red-400/40 leading-none">location_on</span>
                                                                      <span className="truncate">{event.location}</span>
                                                                    </span>
                                                                  </>
                                                                )}
                                                            </div>
                                                          </div>
                                                          {event.photos && event.photos.length > 0 && (
                                                            <div className="flex -space-x-4 shrink-0 transition-all group-hover/item:-space-x-2">
                                                              {event.photos.slice(0, 2).map((p, i) => (
                                                                <div 
                                                                  key={i} 
                                                                  className="w-12 h-12 rounded-lg border-2 border-slate-900 bg-neutral-800 overflow-hidden shadow-lg -rotate-3 group-hover/item:rotate-0 transition-all"
                                                                >
                                                                   <img src={typeof p === 'string' ? p : (p as any)?.src?.medium} className="w-full h-full object-cover" alt="" />
                                                                </div>
                                                              ))}
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}

                                                {/* Documents for this place */}
                                                {place.documents && place.documents.length > 0 && showDocuments && (
                                                  <div className="space-y-1.5 pt-1">
                                                    {place.documents
                                                      .filter(doc => {
                                                        const start = doc.day || (place.day || 1);
                                                        const end = doc.endDay || start;
                                                        return day.dayNumber >= start && day.dayNumber <= end;
                                                      })
                                                      .map((doc, docIdx) => {
                                                        const ext = doc.name.split('.').pop()?.toLowerCase();
                                                        const isPDF = ext === 'pdf';
                                                        const isDoc = ['doc', 'docx'].includes(ext || '');
                                                        const isSheet = ['xls', 'xlsx', 'csv'].includes(ext || '');
                                                        const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext || '');
                                                        const isImg = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');

                                                        const getFileIcon = () => {
                                                          if (isPDF) return 'picture_as_pdf';
                                                          if (isDoc) return 'description';
                                                          if (isSheet) return 'table_chart';
                                                          if (isAudio) return 'audio_file';
                                                          if (isImg) return 'image';
                                                          return 'draft';
                                                        };

                                                        return (
                                                          <div
                                                            key={`doc-${docIdx}`}
                                                            className="px-3 py-2.5 rounded-xl border border-blue-400/20 bg-blue-400/10 backdrop-blur-md hover:bg-blue-400/20 transition-all group/item shadow-sm cursor-pointer"
                                                            onClick={(e) => { e.stopPropagation(); setAttachmentDetail({ data: { type: 'document', document: doc }, placeId: place.id }) }}
                                                          >
                                                            <div className="flex items-center gap-3">
                                                              <div className="w-9 h-9 rounded-xl bg-blue-400/20 border border-blue-400/30 flex items-center justify-center shrink-0 group-hover/item:bg-blue-400/30 transition-colors">
                                                                <span className="material-symbols-outlined text-blue-400 text-lg">{getFileIcon()}</span>
                                                              </div>
                                                              <div className="flex-1 min-w-0">
                                                                <div className="text-blue-100 text-xs font-bold truncate tracking-tight mb-0.5">{doc.name}</div>
                                                                <div className="text-blue-400/60 text-[10px] font-mono leading-none flex items-center gap-2">
                                                                  <span>{isImg ? 'PHOTO' : isPDF ? 'PDF' : isAudio ? 'AUDIO' : isDoc ? 'DOCUMENT' : isSheet ? 'SHEET' : 'FILE'}</span>
                                                                  {doc.file && (
                                                                     <>
                                                                       <span className="opacity-30">|</span>
                                                                       <span className="flex items-center gap-1 opacity-60">
                                                                         <span className="material-symbols-outlined text-[10px]">attach_file</span>
                                                                         <span>UPLOADED</span>
                                                                       </span>
                                                                     </>
                                                                  )}
                                                                </div>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        )
                                                      })}
                                                  </div>
                                                )}

                                                {/* Links for this place */}
                                                {place.links && place.links.length > 0 && showLinks && (
                                                  <div className="space-y-1.5 pt-1">
                                                    {place.links
                                                      .filter(link => {
                                                        const start = link.day || (place.day || 1);
                                                        const end = link.endDay || start;
                                                        return day.dayNumber >= start && day.dayNumber <= end;
                                                      })
                                                      .map((link, linkIdx) => {
                                                        const domain = link.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
                                                        const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
                                                        
                                                        return (
                                                          <div
                                                            key={`link-${linkIdx}`}
                                                            className="px-3 py-2.5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 backdrop-blur-md hover:bg-cyan-400/20 transition-all group/item shadow-sm cursor-pointer"
                                                            onClick={(e) => { e.stopPropagation(); setAttachmentDetail({ data: { type: 'link', link }, placeId: place.id }) }}
                                                          >
                                                            <div className="flex items-center gap-3">
                                                              <div className="w-9 h-9 rounded-xl bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center shrink-0 group-hover/item:bg-cyan-400/30 transition-colors overflow-hidden p-2">
                                                                 <img src={favicon} className="w-full h-full object-contain" alt="" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%2322d3ee" stroke-width="2" opacity="0.4"><circle cx="12" cy="12" r="10"/></svg>' }} />
                                                              </div>
                                                              <div className="flex-1 min-w-0">
                                                                <div className="text-cyan-100 text-xs font-bold truncate tracking-tight mb-0.5">{link.title || link.url}</div>
                                                                <div className="text-cyan-400/60 text-[10px] font-mono leading-none truncate uppercase">
                                                                  {domain}
                                                                </div>
                                                              </div>
                                                              <span className="material-symbols-outlined text-cyan-400/30 text-xs group-hover/item:text-cyan-400 transition-colors">open_in_new</span>
                                                            </div>
                                                          </div>
                                                        )
                                                      })}
                                                  </div>
                                                )}

                                                {/* Inline add buttons */}
                                                {isEditMode && (
                                                  <div className="flex gap-1 flex-wrap">
                                                    <button
                                                      onClick={(e) => { e.stopPropagation(); setActiveAttachmentPlaceId(place.id); setActiveAttachmentType('accommodation'); setActiveAttachmentDefaultDay(day.dayNumber) }}
                                                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 hover:bg-yellow-400/20 transition-colors"
                                                      title="Add Accommodation"
                                                    >
                                                      <span className="material-symbols-outlined text-xs">add</span>
                                                      <span className="material-symbols-outlined text-xs text-yellow-400">bed</span>
                                                    </button>
                                                    <button
                                                      onClick={(e) => { e.stopPropagation(); setActiveAttachmentPlaceId(place.id); setActiveAttachmentType('event'); setActiveAttachmentDefaultDay(day.dayNumber) }}
                                                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 hover:bg-red-400/20 transition-colors"
                                                      title="Add Activity"
                                                    >
                                                      <span className="material-symbols-outlined text-xs">add</span>
                                                      <span className="material-symbols-outlined text-xs text-red-400">flag</span>
                                                    </button>
                                                    <button
                                                      onClick={(e) => { e.stopPropagation(); setActiveAttachmentPlaceId(place.id); setActiveAttachmentType('document'); setActiveAttachmentDefaultDay(day.dayNumber) }}
                                                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-blue-400 bg-blue-400/10 border border-blue-400/20 hover:bg-blue-400/20 transition-colors"
                                                      title="Add Document"
                                                    >
                                                      <span className="material-symbols-outlined text-xs">add</span>
                                                      <span className="material-symbols-outlined text-xs text-blue-400">description</span>
                                                    </button>
                                                    <button
                                                      onClick={(e) => { e.stopPropagation(); setActiveAttachmentPlaceId(place.id); setActiveAttachmentType('link'); setActiveAttachmentDefaultDay(day.dayNumber) }}
                                                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 hover:bg-cyan-400/20 transition-colors"
                                                      title="Add Link"
                                                    >
                                                      <span className="material-symbols-outlined text-xs">add</span>
                                                      <span className="material-symbols-outlined text-xs text-cyan-400">link</span>
                                                    </button>

                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Outbound Connection Section (Only for Last Place -> Home) */}
                                      {(() => {
                                        const isLastTotal = globalPlaceIndex === places.length - 1;
                                        if (!isLastTotal) return null; // Others are handled as Inbound for the next place

                                        const targetId = 'home'
                                        const legs = place.transport?.filter(t => t.to === targetId && t.from === place.id)
                                          .sort((a,b) => (a.departureDay || 1) - (b.departureDay || 1) || (a.departure || '').localeCompare(b.departure || '')) || []
                                        
                                        // Pin connector to departureDay of first leg if set, otherwise last day of stay
                                        const anchorDay = (legs[0]?.departureDay) ?? (place.endDay || place.day || 1)
                                        const isAnchorDay = day.dayNumber === anchorDay

                                        if (legs.length === 0 && !isEditMode) return null
                                        const shouldShowSection = (showTransports || isEditMode) && isAnchorDay;
                                        if (!shouldShowSection && legs.length === 0) return null;

                                        return (
                                          <div className="space-y-1 mt-1 mb-2">
                                            {legs.map((leg, lIdx) => {
                                              const modeIcon = transportModeIcon(leg.type)
                                              const isOutboundLive = getTransportLiveStatus(leg)
                                              const hasDocs = (leg.documents?.length ?? 0) > 0

                                              return (
                                                <div key={leg.id} className={`flex items-start gap-4 ${isOutboundLive ? 'relative' : ''}`}>
                                                  <div className="relative w-[50px] shrink-0 flex flex-col items-end py-1">
                                                    <div className={`w-px h-full min-h-[24px] ${isOutboundLive ? 'bg-primary/40' : 'bg-white/20'} absolute right-[19px]`}></div>
                                                  </div>
                                                  <div className="flex-1 flex items-center gap-2">
                                                    <button
                                                      onClick={() => openTransportModal(globalPlaceIndex, 'after', leg.id, day.dayNumber)}
                                                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg transition text-xs font-medium ${hasDocs ? 'py-2 px-3' : 'py-1'} ${
                                                        isOutboundLive ? 'bg-primary/20 border-primary ring-1 ring-primary/30 shadow-[0_0_15px_rgba(195,244,0,0.15)]' : 'bg-primary/10 border-primary/30'
                                                      } border text-white hover:bg-primary/20 cursor-pointer`}
                                                      title="Edit transport leg"
                                                    >
                                                       <div className="flex items-center gap-2">
                                                         {(leg.departure || (leg.arrivalDay && leg.departureDay && leg.arrivalDay > leg.departureDay)) && (
                                                           <span className="text-neutral-400 font-mono text-[10px] flex items-center gap-0.5">
                                                             {leg.arrivalDay && leg.departureDay && leg.arrivalDay > leg.departureDay && (
                                                               <span className="text-primary/70 font-bold mr-0.5">D{leg.departureDay}</span>
                                                              )}
                                                             {leg.departure || '—'}
                                                           </span>
                                                          )}
                                                         <span className="material-symbols-outlined text-sm text-primary">{modeIcon}</span>
                                                         <span className="text-white text-[11px] font-medium truncate max-w-[120px]">{leg.title || transportModeLabel(leg.type)}</span>
                                                         {(leg.arrival || (leg.arrivalDay && leg.departureDay && leg.arrivalDay > leg.departureDay)) && (
                                                           <span className="text-neutral-400 font-mono text-[10px] flex items-center gap-0.5">
                                                             {leg.arrivalDay && leg.departureDay && leg.arrivalDay > leg.departureDay && (
                                                               <span className="text-primary/70 font-bold mr-0.5">D{leg.arrivalDay}</span>
                                                              )}
                                                             {leg.arrival || '—'}
                                                           </span>
                                                          )}
                                                       </div>
                                                    </button>
                                                    {isEditMode && lIdx === legs.length - 1 && (
                                                      <button 
                                                        onClick={() => openTransportModal(globalPlaceIndex, 'after', undefined, day.dayNumber)}
                                                        className="w-8 h-8 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-neutral-500 hover:text-primary hover:border-primary/50 transition-all active:scale-90"
                                                        title="Add another leg"
                                                      >
                                                        <span className="material-symbols-outlined text-sm">add</span>
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                              )
                                            })}
                                            {legs.length === 0 && isEditMode && (
                                              <div className="flex items-start gap-4">
                                                <div className="relative w-[50px] shrink-0 flex flex-col items-end py-1">
                                                  <div className="w-px h-full min-h-[24px] bg-white/20 absolute right-[19px]"></div>
                                                </div>
                                                <div className="flex-1">
                                                  <button
                                                    onClick={() => openTransportModal(globalPlaceIndex, 'after', undefined, day.dayNumber)}
                                                    className="w-full flex items-center justify-center gap-2 py-1 rounded-lg transition text-xs font-medium bg-white/5 border border-dashed border-white/15 hover:bg-white/10 text-neutral-500 hover:text-white"
                                                    title="Add transport after"
                                                  >
                                                    <span className="material-symbols-outlined text-sm">add</span>
                                                  </button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })()}

                                      </div>
                                    )
                                  })}

                                {/* Add Place Button at the end of the timeline */}
                                {isEditMode ? (
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
                                          handleOpenAddPlace()
                                        }}
                                        className="w-full bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 flex items-center justify-center gap-2 hover:bg-primary/20 hover:border-primary/60 transition-all text-primary font-semibold group active:scale-95 duration-150"
                                      >
                                        <span className="text-sm font-bold uppercase tracking-wider">Add Place</span>
                                      </button>
                                    </div>
                                  </div>
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Last place to home bridge */}
                      <div className="h-4 w-px bg-white/20 mx-auto"></div>

                    </div>
                  )}
                </div>
            </div>
          </div>

          {/* Section 2: Map Card - Shown on desktop, mobile has floating drawer instead */}
          {showMap && !isMobile && (
          <div className="min-w-0 overflow-hidden lg:sticky lg:top-24 h-fit">
              <div className="bg-neutral-900/20 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-xl">map</span>
                    <div>
                      <h2 className="text-lg font-bold text-white font-headline">Trip Map</h2>
                      <p className="text-neutral-400 text-xs mt-0.5">Full route and location map</p>
                    </div>
                  </div>
                </div>
                {places.length > 0 ? (
                  <div className="relative">
                    <MapSlot 
                      places={places} 
                      emoji={trip?.emoji} 
                      focusedPlaceId={focusedPlaceId}
                      showDayNumbers={true}
                      className="h-[600px] lg:h-[calc(100vh-220px)] min-h-[500px] max-h-[900px] shadow-2xl relative z-10"
                      searchResults={isPlaceSearchOpen ? searchResults : EMPTY_ARRAY}
                      selectedSearchResultId={selectedSearchResult?.id}
                      onSearchResultClick={selectPlaceFromSearch}
                      mapStyle={trip?.mapStyle}
                      onStyleChange={handleStyleChange}
                      onMarkerClick={focusPlace}
                      onMapClick={handleMapClick}
                      onViewportChange={handleViewportChange}
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
            )}
          </div>
        </div>

        {/* Floating Mobile Map Button */}
        {showMap && isMobile && (
          <button
            onClick={() => setIsMobileMapOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-black rounded-full shadow-[0_8px_30px_rgba(195,244,0,0.4)] flex items-center justify-center z-[100] active:scale-95 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
          >
            <span className="material-symbols-outlined text-[28px] font-bold">map</span>
            {/* Pulsing Ring */}
            <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping -z-10" />
          </button>
        )}

        {/* Mobile Map Panel (Drawer) */}
        {isMobileMapOpen && (
          <div className="fixed inset-0 z-[2000] lg:hidden flex justify-end">
            {/* Backdrop */}
            <div 
              className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-400 ${isMobileMapClosing ? 'opacity-0' : 'opacity-100'} animate-in fade-in duration-300`}
              onClick={closeMobileMap}
            />
            
            {/* Panel */}
            <div className={`relative w-[90%] sm:w-[500px] h-full bg-neutral-900 border-l border-white/10 shadow-2xl flex flex-col ${isMobileMapClosing ? 'animate-slide-out' : 'animate-slide-in'}`}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5 bg-neutral-950/50">
                <div className="flex items-center gap-1">
                  <button 
                    onClick={closeMobileMap}
                    className="w-10 h-10 -ml-2 flex items-center justify-center text-white hover:bg-white/5 rounded-full transition-colors"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <div className="h-4 w-px bg-white/10 mx-1" />
                  <span className="material-symbols-outlined text-primary ml-1">map</span>
                  <p className="text-xs font-black text-white uppercase tracking-widest ml-2">Trip Map Overlay</p>
                </div>
                <button 
                  onClick={closeMobileMap}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-neutral-400"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Map Content Container */}
              <div className="flex-1 relative bg-neutral-950 overflow-hidden">
                {places.length > 0 ? (
                  <div className="w-full h-full">
                    <MapSlot 
                      places={places} 
                      emoji={trip?.emoji} 
                      focusedPlaceId={focusedPlaceId}
                      showDayNumbers={true}
                      className="w-full h-full"
                      searchResults={isPlaceSearchOpen ? searchResults : EMPTY_ARRAY}
                      selectedSearchResultId={selectedSearchResult?.id}
                      onSearchResultClick={selectPlaceFromSearch}
                      mapStyle={trip?.mapStyle}
                      onMarkerClick={handleMobileMarkerClick}
                      onStyleChange={handleStyleChange}
                      onViewportChange={handleViewportChange}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-neutral-900/50">
                    <span className="material-symbols-outlined text-4xl text-neutral-700 mb-2">map</span>
                    <p className="text-sm font-medium text-neutral-500">No places with locations yet</p>
                  </div>
                )}
              </div>

              {/* Footer / Shortcuts */}
              <div className="p-4 border-t border-white/5 bg-neutral-950/50 flex flex-col gap-3">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Quick View</p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                   {places.slice(0, 8).map(p => (
                     <button
                       key={p.id}
                       onClick={() => setFocusedPlaceId(p.id)}
                       className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
                         focusedPlaceId === p.id 
                           ? 'bg-primary/20 border-primary text-primary' 
                           : 'bg-white/5 border-white/10 text-neutral-400'
                       }`}
                     >
                       <span>{p.emoji || '📍'}</span>
                       <span className="truncate max-w-[80px]">{p.name}</span>
                     </button>
                   ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>



      {/* Event Modal */}
      {isEventModalOpen && (
        <div className="modal-backdrop p-4 md:p-8 animate-in fade-in duration-300">
          <div className="modal-container w-full max-w-md max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            {/* Modal Header */}
            <div className="flex items-center gap-4 p-6 border-b border-neutral-700 bg-white/5 backdrop-blur-xl shrink-0">
              <button
                type="button"
                onClick={resetEventModal}
                className="w-10 h-10 bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-neutral-400 hover:bg-neutral-800/60 hover:text-white transition-all duration-300 active:scale-95 shadow-lg shrink-0"
                aria-label="Back"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-heading-4 text-white font-bold">Add Activity</h2>
                <p className="text-neutral-400 text-xs mt-1">{places.find(p => p.id === eventPlaceId)?.name}</p>
              </div>
            </div>

            {/* Event Form */}
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-white">Create New Activity</h3>
                <p className="text-neutral-400 text-sm">
                  {places.find(p => p.id === eventPlaceId)?.name}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Activity Title</label>
                  <input
                    type="text"
                    value={eventTitle}
                    maxLength={100}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="Enter activity title"
                    className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded text-white placeholder-neutral-500 focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Description</label>
                  <textarea
                    value={eventDescription}
                    maxLength={300}
                    onChange={(e) => setEventDescription(e.target.value)}
                    placeholder="Activity description (optional)"
                    rows={3}
                    className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded text-white placeholder-neutral-500 focus:border-primary outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Start Day</label>
                    <select
                      value={eventDay || 1}
                      onChange={(e) => {
                        const d = parseInt(e.target.value)
                        setEventDay(d)
                        if (eventEndDay && eventEndDay < d) setEventEndDay(d)
                      }}
                      className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded text-white focus:border-primary outline-none text-sm cursor-pointer"
                    >
                      {(() => {
                        const place = places.find(p => p.id === eventPlaceId)
                        const start = place?.day || 1
                        const end = place?.endDay || start
                        return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(d => (
                          <option key={d} value={d}>Day {d}</option>
                        ))
                      })()}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">End Day</label>
                    <select
                      value={eventEndDay || eventDay || 1}
                      onChange={(e) => setEventEndDay(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded text-white focus:border-primary outline-none text-sm cursor-pointer"
                    >
                      {(() => {
                        const place = places.find(p => p.id === eventPlaceId)
                        const start = place?.day || 1
                        const end = place?.endDay || start
                        return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(d => (
                          <option key={d} value={d} disabled={d < (eventDay || 1)}>Day {d}</option>
                        ))
                      })()}
                    </select>
                  </div>
                </div>


                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">From</label>
                    <TimePicker
                      value={eventTime}
                      onChange={setEventTime}
                      placeholder="Start time"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">To</label>
                    <TimePicker
                      value={eventEndTime}
                      onChange={setEventEndTime}
                      placeholder="End time"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-neutral-700 bg-surface-container-highest p-6 shrink-0">
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
                  Add Activity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attachments Modal */}
      {isAttachmentsModalOpen && attachmentsPlaceId && (
        <div className="modal-backdrop p-4 md:p-8 animate-in fade-in duration-300">
          <div className="modal-container w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-500 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center gap-4 p-6 border-b border-neutral-700 bg-white/5 backdrop-blur-xl shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsAttachmentsModalOpen(false)
                  setAttachmentsPlaceId(null)
                  setAttachmentNoteText('')
                  setAttachmentDocTitle('')
                  setAttachmentDocUrl('')
                  setAttachmentLinkTitle('')
                  setAttachmentLinkUrl('')
                }}
                className="w-10 h-10 bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-neutral-400 hover:bg-neutral-800/60 hover:text-white transition-all duration-300 active:scale-95 shadow-lg shrink-0"
                aria-label="Back"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </button>
              <h2 className="text-heading-4 text-white font-bold">Attachments</h2>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-6">
                {/* Current Attachments Display */}
                {places.find(p => p.id === attachmentsPlaceId) && (
                  <div className="space-y-4">
                    {/* Documents */}
                    {places.find(p => p.id === attachmentsPlaceId)?.documents?.map((doc, idx) => (
                      <div key={idx} className="flex gap-3 p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                        <span className="material-symbols-outlined text-blue-400 shrink-0 text-lg">description</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-blue-300 font-medium mb-1">Document</p>
                          <p className="text-sm text-blue-100 truncate">{doc.name || doc.url || 'Untitled'}</p>
                        </div>
                      </div>
                    ))}

                    {/* Links */}
                    {places.find(p => p.id === attachmentsPlaceId)?.links?.map((link, idx) => (
                      <div key={idx} className="flex gap-3 p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20">
                        <span className="material-symbols-outlined text-cyan-400 shrink-0 text-lg">link</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-cyan-300 font-medium mb-1">Link</p>
                          <p className="text-sm text-cyan-100 truncate">{link.title || link.url}</p>
                        </div>
                      </div>
                    ))}

                    {!places.find(p => p.id === attachmentsPlaceId)?.notes && 
                     !places.find(p => p.id === attachmentsPlaceId)?.documents?.length &&
                     !places.find(p => p.id === attachmentsPlaceId)?.links?.length && (
                      <p className="text-center text-neutral-500 text-sm py-4">No attachments yet. Add one below.</p>
                    )}
                  </div>
                )}

                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-sm font-semibold text-neutral-300 mb-4">Add Attachment</h3>
                  <div className="space-y-4">
                    {/* Add Note */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-400 text-base">note</span>
                        Add Note
                      </label>
                      <div className="flex gap-2">
                        <textarea
                          value={attachmentNoteText}
                          onChange={(e) => setAttachmentNoteText(e.target.value)}
                          placeholder="Write a note..."
                          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-neutral-500 focus:border-amber-400/50 outline-none resize-none"
                          rows={2}
                        />
                        <button
                          onClick={() => {
                            if (!attachmentNoteText.trim()) return
                            const place = places.find(p => p.id === attachmentsPlaceId)
                            if (!place) return
                            const updatedPlaces = places.map(p =>
                              p.id === attachmentsPlaceId
                                ? { ...p, notes: attachmentNoteText.trim() }
                                : p
                            )
                            setPlaces(updatedPlaces)
                            savePlacesToTrip(updatedPlaces)
                            setAttachmentNoteText('')
                          }}
                          disabled={!attachmentNoteText.trim()}
                          className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-50 text-amber-300 rounded font-medium text-sm transition-colors shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Add Document */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-400 text-base">description</span>
                        Add Document
                      </label>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={attachmentDocTitle}
                          onChange={(e) => setAttachmentDocTitle(e.target.value)}
                          placeholder="Document name..."
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-neutral-500 focus:border-blue-400/50 outline-none"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={attachmentDocUrl}
                            onChange={(e) => setAttachmentDocUrl(e.target.value)}
                            placeholder="Document URL (optional)..."
                            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-neutral-500 focus:border-blue-400/50 outline-none"
                          />
                          <button
                            onClick={() => {
                              if (!attachmentDocTitle.trim()) return
                              const newDoc: Document = {
                                id: Date.now().toString(),
                                name: attachmentDocTitle.trim(),
                                type: 'other',
                                ...(attachmentDocUrl && { url: attachmentDocUrl })
                              }
                              const place = places.find(p => p.id === attachmentsPlaceId)
                              if (!place) return
                              const updatedPlaces = places.map(p =>
                                p.id === attachmentsPlaceId
                                  ? { ...p, documents: [...(p.documents || []), newDoc] }
                                  : p
                              )
                              setPlaces(updatedPlaces)
                              savePlacesToTrip(updatedPlaces)
                              setAttachmentDocTitle('')
                              setAttachmentDocUrl('')
                            }}
                            disabled={!attachmentDocTitle.trim()}
                            className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 text-blue-300 rounded font-medium text-sm transition-colors shrink-0"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Add Link */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-cyan-400 text-base">link</span>
                        Add Link
                      </label>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={attachmentLinkTitle}
                          onChange={(e) => setAttachmentLinkTitle(e.target.value)}
                          placeholder="Link title..."
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-neutral-500 focus:border-cyan-400/50 outline-none"
                        />
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={attachmentLinkUrl}
                            onChange={(e) => setAttachmentLinkUrl(e.target.value)}
                            placeholder="https://..."
                            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-neutral-500 focus:border-cyan-400/50 outline-none"
                          />
                          <button
                            onClick={() => {
                              if (!attachmentLinkUrl.trim()) return
                              const newLink: PlaceLink = {
                                id: Date.now().toString(),
                                title: attachmentLinkTitle.trim() || 'Link',
                                url: attachmentLinkUrl.trim()
                              }
                              const place = places.find(p => p.id === attachmentsPlaceId)
                              if (!place) return
                              const updatedPlaces = places.map(p =>
                                p.id === attachmentsPlaceId
                                  ? { ...p, links: [...(p.links || []), newLink] }
                                  : p
                              )
                              setPlaces(updatedPlaces)
                              savePlacesToTrip(updatedPlaces)
                              setAttachmentLinkTitle('')
                              setAttachmentLinkUrl('')
                            }}
                            disabled={!attachmentLinkUrl.trim()}
                            className="px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-50 text-cyan-300 rounded font-medium text-sm transition-colors shrink-0"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-neutral-700 bg-surface-container-highest shrink-0">
              <button
                onClick={() => {
                  setIsAttachmentsModalOpen(false)
                  setAttachmentsPlaceId(null)
                  setAttachmentNoteText('')
                  setAttachmentDocTitle('')
                  setAttachmentDocUrl('')
                  setAttachmentLinkTitle('')
                  setAttachmentLinkUrl('')
                }}
                className="btn-secondary btn-md flex-1 text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transport detail/edit modal */}
      {isTransportModalOpen && transportBetweenIndex !== null && transportToPlaceId && (() => {
        const fromId = transportBetweenIndex === -1 ? 'home' : (places[transportBetweenIndex]?.id ?? '')
        const toId = transportToPlaceId
        const fromName = transportBetweenIndex === -1 ? 'Home' : (places[transportBetweenIndex]?.name ?? 'Unknown')
        const toName = toId === 'home' ? 'Home' : (places.find(p => p.id === toId)?.name ?? 'Unknown')
        const existingLeg = editingTransportLegId
          ? (fromId === 'home' ? places[0] : (places[transportBetweenIndex!] || null))?.transport?.find(t => t.id === editingTransportLegId) ?? null
          : null
        
        const fromPlace = fromId === 'home' ? places[0] : places[transportBetweenIndex!]
        const toPlace = toId === 'home' ? places[0] : places.find(p => p.id === toId)
        const fromCoords = fromPlace ? { lat: fromPlace.lat!, lng: fromPlace.lng! } : undefined
        const toCoords = toPlace ? { lat: toPlace.lat!, lng: toPlace.lng! } : undefined

        return (
          <TransportDetailModal
            leg={existingLeg}
            fromName={fromName}
            toName={toName}
            fromId={fromId}
            toId={toId}
            fromCoords={fromCoords}
            toCoords={toCoords}
            totalDays={allDays.length || 1}
            defaultDay={transportLegDefaultDay || undefined}
            minDay={transportMinDay}
            minTime={transportMinTime}
            maxDay={transportMaxDay}
            maxTime={transportMaxTime}
            isEditMode={isEditMode}
            tripStartDate={trip?.startDate}
            mapStyle={trip?.mapStyle}
            onSave={applyTransportLeg}
            onDelete={editingTransportLegId ? deleteTransportLeg : undefined}
            onClose={closeTransportModal}
          />
        )
      })()}



      {/* Place Detail Modal - New unified modal for viewing and editing place details */}
      {isPlaceDetailModalOpen && editingPlaceForDetail && trip && (
        <PlaceDetailModal
          place={editingPlaceForDetail}
          initialDay={placeDetailInitialDay}
          tripStartDate={trip.startDate}
          tripEndDate={trip.endDate || trip.startDate}
          isEditMode={isEditMode}
          onClose={() => {
            setFocusedPlaceId(null)
            setIsPlaceDetailModalOpen(false)
            setEditingPlaceForDetail(null)
          }}
          onDelete={() => {
            setFocusedPlaceId(null)
            deletePlace(editingPlaceForDetail.id)
            setIsPlaceDetailModalOpen(false)
            setEditingPlaceForDetail(null)
          }}
          onSave={async (updatedPlace) => {
            await updatePlace(trip.id, updatedPlace.id, updatedPlace)
            const updatedTrips = await loadTrips()
            const found = updatedTrips.find(t => t.id === id)
            if (found) {
              setTrip(found)
              setPlaces(found.places || [])
            }
          }}
          onSearchResultClick={(place) => {
            setFocusedPlaceId(null)
            setIsPlaceDetailModalOpen(false)
            setEditingPlaceForDetail(null)
            selectPlaceFromSearch(place)
          }}
          onMapClick={(coords) => {
            // Option to relocate or add new?
            // For now just allow discovery
          }}
          onEditLocation={() => setIsPlaceSearchOpen(true)}
          allPlaces={places}
          mapStyle={trip.mapStyle}
        />
      )}

      {/* New Place Configuration Modal - Unified Detail flow */}
      {configuringNewPlace && trip && (
        <PlaceDetailModal
          place={configuringNewPlace}
          initialDay={placeDetailInitialDay}
          tripStartDate={trip.startDate}
          tripEndDate={trip.endDate || trip.startDate}
          isEditMode={true}
          isNew={true}
          onClose={() => setConfiguringNewPlace(null)}
          onSave={async (newPlace) => {
            const pWithRealId = { ...newPlace, id: Date.now().toString() }
            const updated = [...places, pWithRealId]
            setPlaces(updated)
            savePlacesToTrip(updated)
            resetPlaceModal()
            setConfiguringNewPlace(null)
          }}
          onSearchResultClick={(place) => {
            setConfiguringNewPlace(null)
            selectPlaceFromSearch(place)
          }}
          onEditLocation={() => setIsPlaceSearchOpen(true)}
          mapStyle={trip.mapStyle}
        />
      )}

      {/* Share Modal */}
      {isShareModalOpen && trip && (
        <ShareModal
          trip={trip}
          places={places}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      <LocationPickerModal
        isOpen={isPlaceSearchOpen}
        onClose={() => setIsPlaceSearchOpen(false)}
        mapStyle={trip?.mapStyle}
        initialValue={editingPlaceForDetail?.name || configuringNewPlace?.name || ''}
        initialOriginalName={editingPlaceForDetail?.originalName || configuringNewPlace?.originalName || ''}
        initialAddress={editingPlaceForDetail?.location || configuringNewPlace?.location || ''}
        initialLat={editingPlaceForDetail?.lat || configuringNewPlace?.lat}
        initialLng={editingPlaceForDetail?.lng || configuringNewPlace?.lng}
        onSelect={(loc) => {
          selectPlaceFromSearch(loc)
        }}
      />


      {/* Focused Attachment Modal */}
      {activeAttachmentType && activeAttachmentPlaceId && trip && (
        <AttachmentModal
          type={activeAttachmentType}
          placeName={places.find(p => p.id === activeAttachmentPlaceId)?.name}
          placeCoords={(() => {
            const p = places.find(p => p.id === activeAttachmentPlaceId)
            return p ? { lat: p.lat!, lng: p.lng! } : undefined
          })()}
          startDay={places.find(p => p.id === activeAttachmentPlaceId)?.day}
          endDay={places.find(p => p.id === activeAttachmentPlaceId)?.endDay || places.find(p => p.id === activeAttachmentPlaceId)?.day}
          defaultDay={activeAttachmentDefaultDay || undefined}
          tripStartDate={trip?.startDate}
          initialNote={''}
          onClose={() => { setActiveAttachmentType(null); setActiveAttachmentPlaceId(null); setActiveAttachmentDefaultDay(null) }}
          onSave={(payload: AttachmentPayload) => {
            const placeId = activeAttachmentPlaceId
            const updatedPlaces = places.map(p => {
              if (p.id !== placeId) return p
              if (payload.type === 'note') {
                const newNote: Note = {
                  id: Date.now().toString(),
                  text: payload.note || '',
                  day: payload.day || p.day || 1
                }
                return { ...p, notes: Array.isArray(p.notes) ? [...p.notes, newNote] : [newNote] }
              }
              if (payload.type === 'event' && payload.eventTitle) {
                const newEvent: Event = {
                  id: Date.now().toString(),
                  title: payload.eventTitle,
                  description: payload.eventDescription || '',
                  time: payload.eventTime || '',
                  endTime: payload.eventEndTime || '',
                  location: payload.eventLocation || '',
                  date: '',
                  type: 'activity',
                  documents: [],
                  photos: payload.photos || [],
                  day: payload.day || p.day || 1,
                  endDay: payload.eventEndDay || payload.day || p.endDay || p.day || 1,
                }
                return { ...p, events: [...(p.events || []), newEvent] }
              }
              if (payload.type === 'document' && payload.docName) {
                const newDoc: Document = {
                  id: Date.now().toString(),
                  name: payload.docName,
                  type: 'other',
                  ...(payload.docUrl && { url: payload.docUrl }),
                  ...(payload.docFile && { file: payload.docFile }),
                  day: payload.day || p.day || 1,
                }
                return { ...p, documents: [...(p.documents || []), newDoc] }
              }
              if (payload.type === 'link' && payload.linkUrl) {
                const newLink: PlaceLink = {
                  id: Date.now().toString(),
                  title: payload.linkTitle || payload.linkUrl,
                  url: payload.linkUrl,
                  day: payload.day || p.day || 1,
                }
                return { ...p, links: [...(p.links || []), newLink] }
              }
              if (payload.type === 'accommodation' && payload.accName) {
                const newAcc: Accommodation = {
                  id: Date.now().toString(),
                  name: payload.accName,
                  type: payload.accType || 'hotel',
                  checkIn: payload.accCheckIn || '',
                  checkInDay: payload.accCheckInDay || p.day || 1,
                  checkOut: payload.accCheckOut || '',
                  checkOutDay: payload.accCheckOutDay || p.endDay || p.day || 1,
                  address: payload.accAddress || '',
                  documents: [],
                  photos: payload.photos || [],
                }
                return { ...p, accommodations: [...(p.accommodations || []), newAcc] }
              }
              return p
            })
            setPlaces(updatedPlaces)
            savePlacesToTrip(updatedPlaces)
          }}
        />
      )}

      {/* Edit Trip Modal - uses reusable TripForm (standardized modal style) */}
      {isEditModalOpen && trip && (
        <ModalBackdrop onClick={() => setIsEditModalOpen(false)} className="z-[100] !p-0">
          <ModalContainer 
            size="full" 
            className="h-full max-w-none !rounded-none bg-slate-950"
            tint="rgba(34, 211, 238, 0.05)"
          >
            <div ref={editModalScrollRef} className="h-full overflow-y-auto">
              <ParallaxBackground 
                src={previewWallpaper || trip.wallpaper || ''} 
                opacity={1} 
                parallaxFactor={0.15}
                containerRef={editModalScrollRef}
              />
              
              <AppHeader 
                center={<span className="text-sm font-bold text-white uppercase tracking-widest">Edit Trip</span>}
                onBack={() => setIsEditModalOpen(false)}
                className="!bg-neutral-900/40 backdrop-blur-xl border-b border-white/5"
              />

              <main className="relative pt-32 pb-40 px-6 md:px-10 z-10 flex flex-col items-center">
                <div className="w-full max-w-2xl">
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
                  onCancel={() => {
                    setIsEditModalOpen(false)
                    setPreviewWallpaper(null) // Reset preview on cancel
                  }}
                  isSubmitting={isEditSubmitting}
                  submitButtonText="Save Changes"
                  onEmojiPickerToggle={setIsEmojiPickerInForm}
                  onWallpaperPickerToggle={setIsWallpaperPickerInForm}
                  hideBackground={true}
                  onWallpaperChange={setPreviewWallpaper}
                  onDelete={() => {
                    deleteTrip(trip!.id)
                    window.location.href = '/'
                  }}
                />
                </div>
              </main>
            </div>
          </ModalContainer>
        </ModalBackdrop>
      )}
      {/* Trip View Settings Modal */}
      {isViewSettingsOpen && (
        <ModalBackdrop onClick={() => setIsViewSettingsOpen(false)}>
          <ModalContainer>
            <ModalHeader title="Trip View Settings" onClose={() => setIsViewSettingsOpen(false)} />
            <ModalContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-3">Core Elements</h4>
                  
                  <button 
                    onClick={() => setShowTransports(!showTransports)}
                    className="flex w-full items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined ${showTransports ? 'text-primary' : 'text-neutral-500'}`}>directions_bus</span>
                      <span className="text-sm font-medium text-white">Transports</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${showTransports ? 'bg-primary' : 'bg-neutral-600'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showTransports ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </button>

                  <button 
                    onClick={() => setShowPlaces(!showPlaces)}
                    className="flex w-full items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined ${showPlaces ? 'text-primary' : 'text-neutral-500'}`}>location_on</span>
                      <span className="text-sm font-medium text-white">Places</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${showPlaces ? 'bg-primary' : 'bg-neutral-600'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showPlaces ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => setShowMap(!showMap)}
                    className="flex w-full items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined ${showMap ? 'text-primary' : 'text-neutral-500'}`}>map</span>
                      <span className="text-sm font-medium text-white">Map View</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${showMap ? 'bg-primary' : 'bg-neutral-600'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showMap ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10">
                  <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-3">Place Details</h4>
                  
                  <div className={`space-y-2 transition-opacity ${!showPlaces ? 'opacity-50 pointer-events-none' : ''}`}>
                    <button 
                      onClick={() => setShowAccommodations(!showAccommodations)}
                      className="flex w-full items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined ${showAccommodations ? 'text-yellow-400' : 'text-neutral-500'}`}>bed</span>
                        <span className="text-sm font-medium text-white">Accommodations</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${showAccommodations ? 'bg-yellow-500' : 'bg-neutral-600'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showAccommodations ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                    </button>

                    <button 
                      onClick={() => setShowEvents(!showEvents)}
                      className="flex w-full items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined ${showEvents ? 'text-red-400' : 'text-neutral-500'}`}>flag</span>
                        <span className="text-sm font-medium text-white">Events & Activities</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${showEvents ? 'bg-red-500' : 'bg-neutral-600'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showEvents ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                    </button>

                    <button 
                      onClick={() => setShowDocuments(!showDocuments)}
                      className="flex w-full items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined ${showDocuments ? 'text-blue-400' : 'text-neutral-500'}`}>description</span>
                        <span className="text-sm font-medium text-white">Documents</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${showDocuments ? 'bg-blue-500' : 'bg-neutral-600'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showDocuments ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                    </button>

                    <button 
                      onClick={() => setShowLinks(!showLinks)}
                      className="flex w-full items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined ${showLinks ? 'text-cyan-400' : 'text-neutral-500'}`}>link</span>
                        <span className="text-sm font-medium text-white">URLs & Links</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${showLinks ? 'bg-cyan-500' : 'bg-neutral-600'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showLinks ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </ModalContent>
          </ModalContainer>
        </ModalBackdrop>
      )}

      {/* ── Attachment Detail Modal (view/edit existing items) ─────────────── */}
      {attachmentDetail && (() => {
        const placeId = attachmentDetail.placeId
        const place = places.find(p => p.id === placeId)
        return (
          <AttachmentDetailModal
            data={attachmentDetail.data}
            isEditMode={isEditMode}
            placeName={place?.name}
            placeStartDay={place?.day || 1}
            placeEndDay={place?.endDay || place?.day || 1}
            tripStartDate={trip?.startDate}
            onClose={() => setAttachmentDetail(null)}
            onDelete={async () => {
              if (!place) { setAttachmentDetail(null); return }
              let updatedPlaces = places
              if (attachmentDetail.data.type === 'event' && attachmentDetail.data.event) {
                updatedPlaces = places.map(p => p.id === placeId ? { ...p, events: p.events.filter(e => e.id !== attachmentDetail.data.event!.id) } : p)
              } else if (attachmentDetail.data.type === 'document' && attachmentDetail.data.document) {
                updatedPlaces = places.map(p => p.id === placeId ? { ...p, documents: p.documents.filter(d => d.id !== attachmentDetail.data.document!.id) } : p)
              } else if (attachmentDetail.data.type === 'link' && attachmentDetail.data.link) {
                updatedPlaces = places.map(p => p.id === placeId ? { ...p, links: p.links.filter(l => l.id !== attachmentDetail.data.link!.id) } : p)
              } else if (attachmentDetail.data.type === 'accommodation' && attachmentDetail.data.accommodation) {
                updatedPlaces = places.map(p => p.id === placeId ? { ...p, accommodations: (p.accommodations || []).filter(a => a.id !== attachmentDetail.data.accommodation!.id) } : p)
              }
              setPlaces(updatedPlaces)
              await savePlacesToTrip(updatedPlaces)
              setAttachmentDetail(null)
            }}
            onSave={async (updated) => {
              if (!place) { setAttachmentDetail(null); return }
              let updatedPlaces = places
              if (updated.type === 'event' && updated.event) {
                updatedPlaces = places.map(p => p.id === placeId ? { ...p, events: p.events.map(e => e.id === updated.event!.id ? updated.event! : e) } : p)
              } else if (updated.type === 'document' && updated.document) {
                updatedPlaces = places.map(p => p.id === placeId ? { ...p, documents: p.documents.map(d => d.id === updated.document!.id ? updated.document! : d) } : p)
              } else if (updated.type === 'link' && updated.link) {
                updatedPlaces = places.map(p => p.id === placeId ? { ...p, links: p.links.map(l => l.id === updated.link!.id ? updated.link! : l) } : p)
              } else if (updated.type === 'accommodation' && updated.accommodation) {
                updatedPlaces = places.map(p => p.id === placeId ? { ...p, accommodations: (p.accommodations || []).map(a => a.id === updated.accommodation!.id ? updated.accommodation! : a) } : p)
              }
              setPlaces(updatedPlaces)
              await savePlacesToTrip(updatedPlaces)
              setAttachmentDetail(null)
            }}
          />
        )
      })()}

      {mediaViewer && (
        <MediaViewer
          items={mediaViewer.items.map(url => ({
            url,
            type: getMediaType(url)
          }))}
          initialIndex={mediaViewer.index}
          onClose={() => setMediaViewer(null)}
        />
      )}

      {/* Print Footer */}
      <div className="hidden print:block border-t border-white/10 pt-10 mt-12 text-center text-neutral-500 pb-10">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-xl">map</span>
            <span className="text-lg font-black tracking-tight text-white">Trippi</span>
          </div>
          <p className="text-xs max-w-sm mx-auto opacity-70">
            For the full interactive experience including maps, documents, and videos, visit your itinerary on the web.
          </p>
          <div className="px-5 py-3 bg-white/5 rounded-2xl border border-white/10 mt-2">
            <p className="text-[10px] font-mono text-primary/80 break-all">
              {typeof window !== 'undefined' ? window.location.href : ''}
            </p>
          </div>
          <p className="text-[9px] uppercase tracking-widest font-black opacity-30 mt-4">
            Curated with care &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
