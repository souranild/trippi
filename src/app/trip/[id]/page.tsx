'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Trip, loadTrips, updateTrip, updatePlace, removePlace, Document, Link as PlaceLink } from '@/lib/storage'
import { useTrips } from '@/context/TripContext'
import EmojiAvatar from '@/components/EmojiAvatar'
import { searchWallpapers, getRandomPlaceholder, searchWikipediaImages } from '@/lib/wallpaper-search'
import { toggleHtmlCheckbox } from '@/lib/rich-text-utils'
import TripForm from '@/components/TripForm'
import TimePicker from '@/components/TimePicker'
import PlaceForm from '@/components/PlaceForm'
import PlaceDetailModal from '@/components/PlaceDetailModal'
import TransportDetailModal from '@/components/TransportDetailModal'
import DiscoveryDetailModal from '@/components/DiscoveryDetailModal'
import { calculateDistance } from '@/lib/discovery'
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
import { formatDate, formatDuration, formatDateShort, formatTime, calculateTimeDuration } from '@/lib/date-utils'
import { isSameDay } from 'date-fns'
import CalendarView from '@/components/CalendarView'
import LocationPickerModal from '@/components/LocationPickerModal'
import { Button } from '@/components/Button'

// Kept for backward compat — prefer formatTime() from date-utils everywhere
function formatTime12h(time: string): string {
  return formatTime(time, timeFormatRef.current)
}
const timeFormatRef = { current: '12h' as '12h' | '24h' }

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
  const { 
    discoveries, 
    setDiscoveries, 
    setIsExpanded,
    selectedDiscovery,
    setSelectedDiscovery,
    isDiscoveryDetailModalOpen,
    setIsDiscoveryDetailModalOpen
  } = useMapContext()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [places, setPlaces] = useState<Place[]>([])
  
  // -- View State --
  const [itineraryViewMode, setItineraryViewMode] = useState<'timeline' | 'calendar' | 'table'>('timeline')
  const [showMap, setShowMap] = useState(true)
  const [showPlaces, setShowPlaces] = useState(true)
  const [showTransports, setShowTransports] = useState(true)
  const [showAccommodations, setShowAccommodations] = useState(true)
  const [showEvents, setShowEvents] = useState(true)
  const [showDocuments, setShowDocuments] = useState(true)
  const [showLinks, setShowLinks] = useState(true)
  const [showNotes, setShowNotes] = useState(true)
  const [compactMode, setCompactMode] = useState(false)
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h')
  const [distanceUnit, setDistanceUnit] = useState<'metric' | 'imperial'>('metric')
  const [timezone, setTimezone] = useState('auto')
  const [isViewSettingsOpen, setIsViewSettingsOpen] = useState(false)
  const [now, setNow] = useState(new Date())
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileStep, setMobileStep] = useState<1 | 2>(1)
  
  // -- Map & Location State --
  const [mapViewport, setMapViewport] = useState<{ center: { lat: number, lng: number }, zoom: number } | null>(null)
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null)
  const [focusedTransportId, setFocusedTransportId] = useState<string | null>(null)
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
  const [minDay, setMinDay] = useState<number | undefined>(undefined)
  const [minTime, setMinTime] = useState<string | undefined>(undefined)
  const [maxDay, setMaxDay] = useState<number | undefined>(undefined)
  const [maxTime, setMaxTime] = useState<string | undefined>(undefined)
  const [initialAttachmentDetail, setInitialAttachmentDetail] = useState<AttachmentDetailData | null>(null)
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
  const [isEditFormValid, setIsEditFormValid] = useState(false)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  const placeDetailBounds = useMemo(() => {
    if (!isPlaceDetailModalOpen || !editingPlaceForDetail || !trip) return null
    const queue = getGlobalItinerary({ ...trip, places } as any)
    const idx = queue.findIndex((item: any) => item.type === 'place' && item.data.id === editingPlaceForDetail.id)
    return getItemBounds(queue, idx)
  }, [isPlaceDetailModalOpen, editingPlaceForDetail, trip, places])
  const [leftPanelWidth, setLeftPanelWidth] = useState(65); // Percentage
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [mediaViewer, setMediaViewer] = useState<{ items: string[]; index: number } | null>(null)
  const [previewWallpaper, setPreviewWallpaper] = useState<string | null>(null)
  const [wallpaperOpacity, setWallpaperOpacity] = useState(1)
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [suggestedDiscoveries, setSuggestedDiscoveries] = useState<PlaceSearchHit[]>([])

  // -- Callbacks (Order is Important!) --

  const getLatestTimeOnDay = useCallback((dayNum: number): string => {
    if (!trip) return '09:00'
    const queue = getGlobalItinerary({ ...trip, places } as Trip)
    const dayItems = queue.filter(item => {
      if (item.type === 'place') {
        const start = item.data.day ?? 1
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
        notes: place.description ? [{ day: editingPlaceForDetail.day ?? 1, text: place.description }, ...editingPlaceForDetail.notes] : editingPlaceForDetail.notes
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
        notes: place.description ? [{ day: configuringNewPlace.day ?? 1, text: place.description }, ...configuringNewPlace.notes] : configuringNewPlace.notes
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
      accommodations: [],
      photos: place.images || (place.image ? [place.image] : []),
      documents: [],
      links: []
    }
    setConfiguringNewPlace(draft)
  }, [newPlaceDay, newPlaceEndDay, getLatestTimeOnDay, editingPlaceForDetail, configuringNewPlace]);

  const tripQuote = useMemo(() => {
    if (!trip) return 'Plan your journey day by day';
    const WISDOM = [
      "The world is a book, and those who do not travel read only one page.",
      "Not all those who wander are lost. But some are definitely just bad at Google Maps.",
      "Travel is the only thing you buy that makes you richer — and a little jet-lagged.",
      "A bad day of travel is still better than a good day in the office.",
      "Life is short and the world is wide. Start packing.",
      "Jet lag is for amateurs. Real travellers just call it 'timezone expansion'.",
      "The best souvenir? The stories no one at home will fully understand.",
      "Every trip changes you. Some for better, some for blisters.",
      "You can't buy happiness, but you can buy plane tickets. Same thing.",
      "Travelling — because adulting is overrated, but boarding passes are not.",
      "Adventure awaits. So does your overweight baggage fee.",
      "Getting lost is just discovering a place that wasn't on the itinerary.",
      "The world is too big to stay in one place. Your comfort zone included.",
      "Collect moments, not things. Except maybe that one fridge magnet.",
      "Travelling solo teaches you that you were never really alone.",
    ];
    const seed = (trip.id || '').split('').reduce((acc, c: string) => acc + c.charCodeAt(0), 0);
    return WISDOM[seed % WISDOM.length];
  }, [trip]);

  const handleAddDiscovery = useCallback((discovery: any) => {
    if (places.length === 0) {
      selectPlaceFromSearch(discovery);
      return;
    }

    const lat = discovery.lat;
    const lng = discovery.lng;
    
    let minDistance = Infinity;
    let closestPlace: Place | null = null;
    
    places.forEach(p => {
      const d = calculateDistance(lat, lng, Number(p.lat), Number(p.lng));
      if (d < minDistance) {
        minDistance = d;
        closestPlace = p;
      }
    });

    if (closestPlace) {
      const targetPlace = closestPlace as Place;
      
      // Calculate date from trip start + place day
      let eventDate = trip?.startDate || new Date().toISOString().split('T')[0];
      if (trip?.startDate && targetPlace.day) {
        const d = new Date(trip.startDate);
        d.setDate(d.getDate() + (targetPlace.day - 1));
        eventDate = d.toISOString().split('T')[0];
      }

      const newActivity: TripEvent = {
        id: Math.random().toString(36).substr(2, 9),
        title: discovery.name,
        time: '12:00',
        location: discovery.name,
        lat: discovery.lat,
        lng: discovery.lng,
        date: eventDate,
        type: 'activity',
        documents: [],
        day: targetPlace.day
      };
      
      const updatedPlace: Place = {
        ...targetPlace,
        events: [...(targetPlace.events || []), newActivity]
      };
      
      const newPlaces = places.map(p => p.id === updatedPlace.id ? updatedPlace : p);
      setPlaces(newPlaces);
      updateTripContext({ ...trip!, places: newPlaces });
      
      setEditingPlaceForDetail(updatedPlace);
      setInitialAttachmentDetail({ type: 'event', event: newActivity });
      setIsPlaceDetailModalOpen(true);
    }
  }, [places, trip, selectPlaceFromSearch, updateTripContext]);

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
      const placeStart = place.day ?? 1;
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
    setPlaceDetailInitialDay(place.day ?? 1)
    setIsPlaceDetailModalOpen(true)
  }, [trip, isMobile]);

  const handleMobileMarkerClick = useCallback((place: Place) => {
    setFocusedPlaceId(place.id);
    closeMobileMap();
    setTimeout(() => {
       const el = document.getElementById(`day-${place.day ?? 1}-place-${place.id}`);
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
          
          // Handle place focus
          const placeMatch = id.match(/day-\d+-place-(.+)/);
          if (placeMatch && placeMatch[1]) {
            setFocusedPlaceId(prev => (prev === placeMatch[1] ? prev : placeMatch[1]));
            setFocusedTransportId(null);
            return;
          }

          // Handle transport focus
          const legMatch = id.match(/leg-(.+)/);
          if (legMatch && legMatch[1]) {
            setFocusedTransportId(prev => (prev === legMatch[1] ? prev : legMatch[1]));
            setFocusedPlaceId(null);
            return;
          }
        }
      },
      {
        // Focus zone is the middle 30% of the screen
        rootMargin: '-35% 0px -35% 0px',
        threshold: 0,
      }
    );

    // Select all place and transport containers in the timeline
    const elements = document.querySelectorAll('[id^="day-"][id*="-place-"], [id^="leg-"]');
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

      const itinerary = getGlobalItinerary({ ...trip, places } as Trip)
      
      let foundPlace: string | null = null
      let foundTransport: string | null = null

      for (const item of itinerary) {
        if (item.type === 'place') {
          const startDay = item.data.day ?? 1
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
          const depDay = item.data.departureDay ?? 1
          const arrDay = item.data.arrivalDay ?? depDay
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
  
  // Keep timeFormatRef in sync with state so formatTime12h uses it
  useEffect(() => { timeFormatRef.current = timeFormat }, [timeFormat])

  // Live clock — update every 30s
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

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
        if (settings.showNotes !== undefined) setShowNotes(settings.showNotes)
        if (settings.compactMode !== undefined) setCompactMode(settings.compactMode)
        if (settings.timeFormat !== undefined) setTimeFormat(settings.timeFormat)
        if (settings.distanceUnit !== undefined) setDistanceUnit(settings.distanceUnit)
        if (settings.timezone !== undefined) setTimezone(settings.timezone)
      } catch (e) {
        console.error('Failed to parse trip settings', e)
      }
    }
  }, [id])

  // Save settings to localStorage when they change
  useEffect(() => {
    const settings = {
      showPlaces, showTransports, showMap, showAccommodations,
      showEvents, showDocuments, showLinks, showNotes,
      compactMode, timeFormat, distanceUnit, timezone
    }
    localStorage.setItem(`trip_settings_${id}`, JSON.stringify(settings))
  }, [showPlaces, showTransports, showMap, showAccommodations, showEvents, showDocuments, showLinks, showNotes, compactMode, timeFormat, distanceUnit, timezone, id])
  
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
  const [attachmentDetail, setAttachmentDetail] = useState<{ data: AttachmentDetailData; placeId: string; transportLegId?: string } | null>(null)

  // Track state of nested pickers in TripForm to manage the global back button
  const [isEmojiPickerInForm, setIsEmojiPickerInForm] = useState(false)
  const [isWallpaperPickerInForm, setIsWallpaperPickerInForm] = useState(false)

  // Calculate all days in the trip
  const getAllDaysInTrip = () => {
    if (!trip?.startDate) return []
    
    // Calculate default range from trip dates
    const tripStart = new Date(trip.startDate)
    const tripEnd = trip.endDate ? new Date(trip.endDate) : new Date(trip.startDate)
    
    let minDay = 1
    let maxDay = Math.ceil((tripEnd.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    // Expand range based on actual content (places and transport)
    places.forEach(place => {
      const pStart = place.day ?? 1
      const pEnd = (place.endDay || place.day) ?? 1
      if (pStart < minDay) minDay = pStart
      if (pEnd > maxDay) maxDay = pEnd
    })

    const days = []
    for (let d = minDay; d <= maxDay; d++) {
      const currentDate = new Date(tripStart)
      currentDate.setDate(tripStart.getDate() + (d - 1))
      
      days.push({
        dayNumber: d,
        date: new Date(currentDate),
        formattedDate: formatDateShort(currentDate),
        places: places.filter(place => {
          const start = place.day ?? 1
          const end = (place.endDay || place.day) ?? 1
          return d >= start && d <= end
        })
      })
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

  const handleAddHome = (initialLocation: string, dayNum: number, position: 'start' | 'end') => {
    setEditingPlace({
      id: '',
      name: 'Home',
      location: initialLocation || '',
      country: '',
      notes: [],
      accommodations: [],
      events: [],
      documents: [],
      links: [],
      photos: [],
      day: dayNum,
      endDay: dayNum,
      arrival: position === 'start' ? '08:00' : '20:00',
      departure: position === 'start' ? '10:00' : '22:00',
      emoji: '🏠'
    } as Place)
    setNewPlaceDay(dayNum)
    setNewPlaceEndDay(dayNum)
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
      setEventDay(place.day ?? 1)
      setEventEndDay(place.day ?? 1)
      if (trip && trip.startDate) {
        const placeDate = new Date(trip.startDate)
        placeDate.setDate(placeDate.getDate() + (place.day ?? 1) - 1)
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
    setEventDay(1)
    setEventEndDay(1)
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

  // Helper to check if a transport leg is currently active
  const getTransportLiveStatus = (leg: Transport, currentDayNum: number, basePlace?: Place) => {
    if (!trip || !trip.startDate) return false;
    const now = new Date();
    const nowTimeMins = now.getHours() * 60 + now.getMinutes();
    const start = new Date(trip.startDate);
    const isToday = isSameDay(new Date(start.getTime() + (currentDayNum - 1) * 86400000), now);
    if (!isToday) return false;

    if (!leg.departure || !leg.arrival) return false;
    
    const depDay = leg.departureDay ?? (basePlace?.day ?? currentDayNum);
    const arrDay = leg.arrivalDay ?? (basePlace?.endDay ?? depDay);
    
    if (currentDayNum < depDay || currentDayNum > arrDay) return false;
    
    const [dh, dm] = leg.departure.split(':').map(Number);
    const [ah, am] = leg.arrival.split(':').map(Number);
    const depMins = dh * 60 + dm;
    const arrMins = ah * 60 + am;
    
    if (currentDayNum === depDay && currentDayNum === arrDay) {
      return nowTimeMins >= depMins && nowTimeMins <= arrMins;
    } else if (currentDayNum === depDay) {
      return nowTimeMins >= depMins;
    } else if (currentDayNum === arrDay) {
      return nowTimeMins <= arrMins;
    } else {
      return true; // Mid-day of a multi-day trip
    }
  };

  const openTransportModal = (placeIndex: number, position: 'before' | 'after', legId?: string, defaultDay?: number) => {
    setTransportLegDefaultDay(defaultDay ?? null)
    const fromPlaceId = position === 'before' ? (placeIndex === 0 ? 'home' : places[placeIndex - 1].id) : places[placeIndex].id
    const toPlaceId = position === 'after' ? (placeIndex === places.length - 1 ? 'home' : places[placeIndex + 1].id) : places[placeIndex].id
    const idx = position === 'before' ? placeIndex - 1 : placeIndex
    setTransportBetweenIndex(idx)
    setTransportToPlaceId(toPlaceId)

    const fromPlace = fromPlaceId === 'home' ? (places[0] || null) : places.find(p => p.id === fromPlaceId)
    
    // Bounds Calculation
    const queue = getGlobalItinerary({ ...trip, places } as Trip)
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

  const onOpenTransportFromMap = useCallback((transport: any, fromName: string, toName: string) => {
    // Find where this transport is in the places array
    const fromPlaceIdx = places.findIndex(p => p.transport?.some(t => t.id === transport.id))
    if (fromPlaceIdx !== -1) {
      openTransportModal(fromPlaceIdx, 'after', transport.id, transport.departureDay)
    }
  }, [places, openTransportModal]);


  useEffect(() => {
    loadTrips().then(trips => {
      const found = trips.find(t => t.id === id)
      if (found) {
        setTrip(found)
        // Load places from trip data and migrate to ensure required arrays exist
        const loadedPlaces = migratePlaces(found.places || [])
        setPlaces(loadedPlaces)
        
        // Load settings
        if (found.settings) {
          if (found.settings.showTransports !== undefined) setShowTransports(found.settings.showTransports)
          if (found.settings.showPlaces !== undefined) setShowPlaces(found.settings.showPlaces)
          if (found.settings.showMap !== undefined) setShowMap(found.settings.showMap)
          if (found.settings.showAccommodations !== undefined) setShowAccommodations(found.settings.showAccommodations)
          if (found.settings.showEvents !== undefined) setShowEvents(found.settings.showEvents)
          if (found.settings.showDocuments !== undefined) setShowDocuments(found.settings.showDocuments)
          if (found.settings.showLinks !== undefined) setShowLinks(found.settings.showLinks)
          if (found.settings.showNotes !== undefined) setShowNotes(found.settings.showNotes)
          if (found.settings.compactMode !== undefined) setCompactMode(found.settings.compactMode)
          if (found.settings.timeFormat !== undefined) {
             setTimeFormat(found.settings.timeFormat)
             timeFormatRef.current = found.settings.timeFormat
          }
          if (found.settings.distanceUnit !== undefined) setDistanceUnit(found.settings.distanceUnit)
        }

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
        setPlaceDetailInitialDay(place.day ?? 1)
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
    const itinerary = getGlobalItinerary({ ...trip, places } as Trip)
    const activeTransport = itinerary.find(item => {
      if (item.type !== 'transport') return false;
      const t = item.data;
      if (!t.departure || !t.arrival) return false;
      
      const [dh, dm] = t.departure.split(':').map(Number);
      const [ah, am] = t.arrival.split(':').map(Number);
      const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
      const depMins = dh * 60 + dm;
      const arrMins = ah * 60 + am;

      const depDay = t.departureDay ?? 1;
      const arrDay = t.arrivalDay ?? depDay;

      // Simple case: same day travel
      if (arrDay === depDay) {
        if (day !== depDay) return false;
        return nowMins >= depMins && nowMins <= arrMins;
      }
      
      // Multi-day travel
      if (day === depDay) return nowMins >= depMins;
      if (day === arrDay) return nowMins <= arrMins;
      if (day > depDay && day < arrDay) return true;
      
      return false;
    });

    if (activeTransport && activeTransport.type === 'transport') {
      return { day, transportId: activeTransport.data.id };
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

  const renderNoteText = (text: string, place: Place, dayNum: number) => {
    if (!text) return null;
    
    const commitPlaceUpdate = (p: Place) => {
      const newPlaces = [...places];
      const idx = newPlaces.findIndex(pl => pl.id === p.id);
      if (idx !== -1) {
        newPlaces[idx] = p;
        setPlaces(newPlaces);
        updateTrip?.(trip!.id, { places: newPlaces });
      }
    };

    // If it looks like HTML, render it directly with the prose-renderer class
    if (text.trim().startsWith('<')) {
      return (
        <div 
          className="prose-renderer text-[11px] leading-relaxed text-neutral-300 font-medium"
          dangerouslySetInnerHTML={{ __html: text }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
              e.stopPropagation();
              const container = e.currentTarget;
              const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
              const index = checkboxes.indexOf(target as HTMLInputElement);
              
              if (index !== -1) {
                const updatedText = toggleHtmlCheckbox(text, index);
                const updatedPlace = {
                  ...place,
                  notes: place.notes?.map(n => n.day === dayNum ? { ...n, text: updatedText } : n)
                };
                commitPlaceUpdate(updatedPlace);
              }
            }
          }}
        />
      )
    }

    const parts = text.split(/(\[[ xX]\])/g)
    let checkpointIdx = 0
    return (
      <div className="space-y-1">
        {parts.map((part, i) => {
          if (part.match(/\[[ xX]\]/)) {
            const idx = checkpointIdx++
            const isChecked = part.toLowerCase() === '[x]'
            return (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  const allCheckboxes = text.match(/\[[ xX]\]/g) || [];
                  let currentIdx = 0;
                  const updatedText = text.replace(/\[[ xX]\]/g, (match) => {
                    if (currentIdx++ === idx) {
                      return isChecked ? '[ ]' : '[x]';
                    }
                    return match;
                  });
                  
                  const updatedPlace = {
                    ...place,
                    notes: place.notes?.map(n => n.day === dayNum ? { ...n, text: updatedText } : n)
                  };
                  commitPlaceUpdate(updatedPlace);
                }}
                className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded border transition-all mr-2 align-middle ${
                  isChecked 
                    ? 'bg-primary border-primary text-slate-950 shadow-[0_0_8px_rgba(143,245,255,0.5)]' 
                    : 'border-white/20 bg-white/5 text-transparent hover:border-primary/50'
                }`}
              >
                {isChecked && <span className="material-symbols-outlined text-[10px] font-black">check</span>}
              </button>
            )
          }
          return <span key={i} className="text-neutral-400">{part}</span>
        })}
      </div>
    )
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
          src={previewWallpaper || trip?.wallpaper || ''} 
          opacity={wallpaperOpacity} 
          parallaxFactor={0.2}
        />
      )}
      <AppHeader 
        onBack={() => router.push('/')}
        isEditMode={isEditMode}
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
                <button
                  type="button"
                  disabled={isEditMode}
                  onClick={(e) => { e.stopPropagation(); setIsViewSettingsOpen(true); }}
                  className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border text-white transition-all active:scale-90 ${
                    isEditMode 
                      ? 'bg-white/5 border-white/5 opacity-30 cursor-not-allowed' 
                      : 'bg-white/10 border-white/20 hover:bg-primary hover:text-black hover:border-primary'
                  }`}
                  title={isEditMode ? "View settings disabled in Edit Mode" : "View Settings"}
                >
                  <span className="material-symbols-outlined text-sm sm:text-[20px]">settings</span>
                </button>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-0.5 sm:p-1 relative">
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  className={`rounded-full px-2 sm:px-3 py-1 text-[9px] sm:text-xs font-bold transition-all ${!isEditMode ? 'bg-white text-slate-950 shadow-lg' : 'text-neutral-400 hover:text-white'}`}
                >
                  Trip
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className={`rounded-full px-2 sm:px-3 py-1 text-[9px] sm:text-xs font-bold transition-all relative ${isEditMode ? 'bg-primary text-slate-950 shadow-lg' : 'text-neutral-400 hover:text-white'}`}
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
                <button
                  type="button"
                  disabled={isEditMode}
                  onClick={(e) => { e.stopPropagation(); setIsViewSettingsOpen(true); }}
                  className={`group relative flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-300 shadow-lg active:scale-90 ${
                    isEditMode 
                      ? 'bg-white/5 border-white/5 text-neutral-600 cursor-not-allowed opacity-30' 
                      : 'bg-white/10 border-white/20 text-white hover:bg-primary hover:text-black hover:border-primary'
                  }`}
                  title={isEditMode ? "View settings disabled in Edit Mode" : "View Settings"}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isEditMode ? '' : 'group-hover:rotate-90 transition-transform duration-500'}`}>settings</span>
                </button>
                <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 relative">
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
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition relative ${isEditMode ? 'bg-primary text-slate-950 shadow-lg' : 'text-neutral-400 hover:text-white'}`}
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
          <div 
            ref={containerRef}
            className={`${showMap ? "grid grid-cols-1 lg:grid-cols-[var(--left-width)_minmax(0,1fr)]" : "max-w-3xl mx-auto w-full"} min-w-0 gap-0 items-start relative transition-all duration-700 ${isResizing ? 'select-none cursor-col-resize' : ''} ${compactMode ? 'compact-mode' : ''}`}
            style={{ '--left-width': showMap ? `${leftPanelWidth}%` : '100%' } as React.CSSProperties}
          >
            {isResizing && (
              <div 
                className="fixed inset-0 z-[1000] cursor-col-resize select-none"
                onPointerMove={(e) => {
                  if (!containerRef.current) return;
                  const rect = containerRef.current.getBoundingClientRect();
                  const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
                  if (newWidth > 10 && newWidth < 90) {
                    setLeftPanelWidth(newWidth);
                    window.dispatchEvent(new Event('resize'));
                  }
                }}
                onPointerUp={() => setIsResizing(false)}
              />
            )}
            {/* Section 1: Unified Timeline */}
            <div className={`min-w-0 overflow-hidden lg:pr-4 transition-all duration-500 ${isEditMode ? 'scale-[0.99] origin-right' : 'scale-100'}`}>
              <div className="bg-neutral-900/30 backdrop-blur-xl border border-white/10 rounded-3xl animate-in slide-in-from-left-4 duration-500 shadow-2xl overflow-hidden" id="itinerary-card">
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white font-headline flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-xl">timeline</span>
                      Itinerary
                    </h2>
                    <p className="text-neutral-500 text-xs mt-1 italic line-clamp-1">&ldquo;{tripQuote}&rdquo;</p>
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
                          onClick={() => setItineraryViewMode('calendar')}
                          className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] transition-all duration-500 ease-out h-[22px] ${
                            itineraryViewMode === 'calendar'
                              ? 'bg-primary text-slate-950 shadow-[0_0_15px_rgba(143,245,255,0.3)] scale-100'
                              : 'text-neutral-500 hover:text-white scale-95'
                          }`}
                          title="Calendar View"
                        >
                          <span className="material-symbols-outlined text-xs">calendar_month</span>
                          <span className={`overflow-hidden transition-all duration-500 ease-out ${itineraryViewMode === 'calendar' ? 'max-w-[80px] opacity-100' : 'max-w-0 opacity-0'}`}>
                            Calendar
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
                  ) : itineraryViewMode === 'calendar' ? (
                    <div className="h-[700px]">
                      <CalendarView
                        trip={trip}
                        places={places}
                        timeFormat={timeFormat}
                        onPlaceClick={(p) => {
                          setEditingPlaceForDetail(p)
                          setIsPlaceDetailModalOpen(true)
                        }}
                        onAddPlace={(day) => {
                          setNewPlaceDay(day)
                          setNewPlaceEndDay(day)
                          handleOpenAddPlace()
                        }}
                      />
                    </div>
                  ) : itineraryViewMode === 'table' ? (
                    <ItineraryTable 
                      trip={trip} 
                      isEditMode={isEditMode}
                      onAdd={(type) => {
                        if (type === 'place') handleOpenAddPlace()
                        else if (type === 'transport') {
                          setTransportBetweenIndex(-1)
                          setIsTransportModalOpen(true)
                        }
                      }}
                      onUpdateTrip={(updatedTrip) => updateTripContext(updatedTrip)}
                      visibilitySettings={{
                        showPlaces,
                        showTransports,
                        showAccommodations,
                        showEvents,
                        showDocuments,
                        showLinks,
                        showNotes,
                        timeFormat,
                        compactMode
                      }}
                      onItemClick={(type, id, data) => {
                        if (type === 'place') {
                          setEditingPlaceForDetail(data);
                          setIsPlaceDetailModalOpen(true);
                        } else if (type === 'transport') {
                          setEditingTransportLegId(id);
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
                      {/* Start of Trip Connection Block */}
                      {places.length > 0 && (
                        (() => {
                          const firstPlace = places[0];
                          const targetId = 'home';
                          const legs = firstPlace.transport?.filter(t => t.from === targetId && t.to === firstPlace.id)
                            .sort((a,b) => (a.departureDay ?? 1) - (b.departureDay ?? 1) || (a.departure || '').localeCompare(b.departure || '')) || []
                          
                          if (legs.length === 0 && !isEditMode) return null;

                          return (
                            <div className="relative ml-[15px] mb-8">
                                <div className="space-y-4">
                                  {isEditMode && (
                                    <div className="relative flex items-center gap-4 group/add">
                                      <div className="relative flex flex-col items-center w-[50px] shrink-0">
                                        <div className="w-px h-full bg-white/10 absolute left-1/2 -translate-x-1/2 -z-10" />
                                        <button
                                          onClick={() => handleAddHome(legs[0]?.fromLocation || legs[0]?.from || '', 1, 'start')}
                                          className="w-9 h-9 rounded-full bg-slate-950 border border-dashed border-primary/30 text-primary/60 hover:border-primary/60 hover:text-primary transition-all flex items-center justify-center active:scale-95 shadow-sm group relative z-10"
                                        >
                                          <span className="material-symbols-outlined text-sm transition-transform group-hover:scale-110">home</span>
                                          <span className="material-symbols-outlined text-[10px] absolute -top-1 -right-1 w-3 h-3 flex items-center justify-center font-black text-primary bg-slate-950 rounded-full">add</span>
                                        </button>
                                      </div>
                                      <button 
                                        onClick={() => handleAddHome(legs[0]?.fromLocation || legs[0]?.from || '', 1, 'start')}
                                        className="flex items-center gap-2 group/btn"
                                      >
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 group-hover/btn:text-primary transition-all">Start from Home</span>
                                      </button>
                                    </div>
                                  )}

                                  {/* Render existing legs from home */}
                                  {legs.map((leg) => {
                                    const modeIcon = transportModeIcon(leg.type)
                                    const isInboundLive = getTransportLiveStatus(leg, 1)
                                    const isFocused = focusedTransportId === leg.id
                                    const isHighlighted = isInboundLive || isFocused

                                    return (
                                      <div key={leg.id} id={`leg-${leg.id}`} className="relative flex items-center gap-4 group/leg">
                                        <div className="relative flex flex-col items-center w-[50px] shrink-0 h-full">
                                          <div className={`w-px h-full ${isHighlighted ? 'bg-primary/40' : 'bg-white/10'} absolute left-1/2 -translate-x-1/2 -z-10`} />
                                          <div className={`relative w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                                            isHighlighted ? 'bg-primary border-primary shadow-[0_0_15px_rgba(195,244,0,0.4)]' : 'bg-neutral-900 border-white/10 group-hover/leg:border-primary/40 shadow-sm'
                                          }`}>
                                            <span className={`material-symbols-outlined text-sm ${isHighlighted ? 'text-slate-950' : 'text-neutral-500 group-hover/leg:text-primary'}`}>{modeIcon}</span>
                                          </div>
                                        </div>
                                        <div className="flex-1 py-1">
                                          <div 
                                            className={`relative group/leg-card p-4 rounded-2xl transition-all duration-500 overflow-hidden border-l-4 ${
                                              isHighlighted 
                                                ? 'bg-primary/5 border-primary shadow-[0_0_30px_rgba(195,244,0,0.1)] ring-1 ring-primary/20 border-l-primary' 
                                                : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] border-l-white/20 hover:border-l-primary/40'
                                            } border-y border-r backdrop-blur-sm cursor-pointer shadow-lg`}
                                            onClick={() => openTransportModal(0, 'before', leg.id, 1)}
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-white group-hover/leg-card:text-primary transition-colors line-clamp-1 leading-tight">
                                                  {leg.title || transportModeLabel(leg.type)}
                                                </h4>
                                                <div className="flex items-center gap-2 text-white/50 text-[10px] font-mono mt-0.5 leading-none">
                                                  <span>D{leg.departureDay ?? 0}</span>
                                                  <span className="opacity-30">→</span>
                                                  <span>D{leg.arrivalDay ?? 1}</span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}

                                  {isEditMode && (
                                    <div className="relative flex items-center gap-4 group/add">
                                      <div className="relative flex flex-col items-center w-[50px] shrink-0">
                                        <div className="w-px h-full bg-white/10 absolute left-1/2 -translate-x-1/2 -z-10" />
                                        <button
                                          onClick={() => openTransportModal(0, 'before', undefined, 1)}
                                          className="w-9 h-9 rounded-full bg-slate-950 border border-dashed border-primary/30 text-primary/60 hover:border-primary/60 hover:text-primary transition-all flex items-center justify-center active:scale-95 shadow-sm group relative z-10"
                                        >
                                          <span className="material-symbols-outlined text-sm">commute</span>
                                          <span className="material-symbols-outlined text-[10px] absolute -top-1 -right-1 w-3 h-3 flex items-center justify-center font-black text-primary bg-slate-950 rounded-full">add</span>
                                        </button>
                                      </div>
                                      <button 
                                        onClick={() => openTransportModal(0, 'before', undefined, 1)}
                                        className="flex items-center gap-2 group/btn"
                                      >
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 group-hover/btn:text-primary transition-all">Add Initial Transport</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                            </div>
                          )
                        })()
                      )}

                      {allDays.map((day, dayIndex) => (
                        <div key={day.dayNumber} id={`day-${day.dayNumber}`} className="relative ml-[15px] transition-all duration-700 rounded-2xl p-2 -m-2">
                          {/* Day Header */}
                          <div className="flex items-center gap-3 mb-4">
                            {/* ... existing header ... */}
                          </div>

                          {(() => {
                            const isCurrentDay = isSameDay(day.date, now);
                            const nowTimeMins = now.getHours() * 60 + now.getMinutes();

                            
                            return (
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


                                  return (
                                    <div key={`${day.dayNumber}-${place.id}`} id={`day-${day.dayNumber}-place-${place.id}`} className="relative flex flex-col mb-1 rounded-2xl">
                                      
                                      {/* Inbound Connection Section */}
                                      {(() => {
                                         const fromId = globalPlaceIndex === 0 ? 'home' : (places[globalPlaceIndex - 1]?.id ?? 'home')
                                         const legs = (globalPlaceIndex === 0 ? place : places[globalPlaceIndex - 1]).transport?.filter(t => t.to === place.id && t.from === fromId && (globalPlaceIndex !== 0 || t.from !== 'home'))
                                           .sort((a,b) => (a.departureDay ?? 1) - (b.departureDay ?? 1) || (a.departure || '').localeCompare(b.departure || '')) || []

                                         if (day.dayNumber !== (place.day || 1)) return null

                                         if (legs.length === 0 && !isEditMode) return null
                                         const shouldShowSection = showTransports || isEditMode;
                                         if (!shouldShowSection && legs.length === 0) return null;

                                        return (
                                          <div className="space-y-1 mb-2">
                                            {legs.map((leg, lIdx) => {
                                              const modeIcon = transportModeIcon(leg.type)
                                              const isInboundLive = getTransportLiveStatus(leg, day.dayNumber)
                                              const isFocused = focusedTransportId === leg.id
                                              const isHighlighted = isInboundLive || isFocused
                                              return (
                                                <div key={leg.id} id={`leg-${leg.id}`} className="relative flex items-center gap-4 group/leg">
                                                  <div className="relative flex flex-col items-center w-[50px] shrink-0 h-full">
                                                    <div className={`w-px h-full ${isHighlighted ? 'bg-primary/40' : 'bg-white/10'} absolute left-1/2 -translate-x-1/2 -z-10`} />
                                                    <div className={`relative w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                                                      isHighlighted ? 'bg-primary border-primary shadow-[0_0_15px_rgba(195,244,0,0.4)]' : 'bg-neutral-900 border-white/10 group-hover/leg:border-primary/40 shadow-sm'
                                                    }`}>
                                                      <span className={`material-symbols-outlined text-sm ${isHighlighted ? 'text-slate-950' : 'text-neutral-500 group-hover/leg:text-primary'}`}>{modeIcon}</span>
                                                    </div>
                                                  </div>
                                                  <div className="flex-1 py-1">
                                                    <div 
                                                      className={`relative group/leg-card p-4 rounded-2xl transition-all duration-500 overflow-hidden border-l-4 ${
                                                        isHighlighted 
                                                          ? 'bg-primary/5 border-primary shadow-[0_0_30px_rgba(195,244,0,0.1)] ring-1 ring-primary/20 border-l-primary' 
                                                          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] border-l-white/20 hover:border-l-primary/40'
                                                      } border-y border-r backdrop-blur-sm cursor-pointer shadow-lg`}
                                                      onClick={() => openTransportModal(globalPlaceIndex, 'before', leg.id, day.dayNumber)}
                                                    >
                                                      <div className="flex items-center gap-3">
                                                        <div className="flex-1 min-w-0">
                                                          <h4 className="text-base font-bold text-white group-hover/leg-card:text-primary transition-colors line-clamp-1 leading-tight">
                                                            {leg.title || transportModeLabel(leg.type)}
                                                          </h4>
                                                          <div className="flex items-center gap-2 text-white/50 text-[10px] font-mono mt-0.5 leading-none">
                                                            {(() => {
                                                              const depDay = leg.departureDay ?? day.dayNumber;
                                                              const arrDay = leg.arrivalDay ?? depDay;
                                                              const spansMultiDays = arrDay > depDay;
                                                              return (
                                                                <>
                                                                  <span className="text-primary font-bold">D{depDay}</span>
                                                                  <span>{leg.departure || '—'}</span>
                                                                  <span className="opacity-30">→</span>
                                                                  <span className="text-primary font-bold">D{arrDay}</span>
                                                                  <span>{leg.arrival || '—'}</span>
                                                                  {(() => {
                                                                    const duration = calculateTimeDuration(leg.departure || '', depDay, leg.arrival || '', arrDay);
                                                                    if (!duration) return null;
                                                                    return (
                                                                      <span className="text-[8px] font-black text-primary bg-primary/10 border border-primary/20 rounded-md px-1 py-0.5 ml-1">
                                                                        {duration}
                                                                      </span>
                                                                    );
                                                                  })()}
                                                                </>
                                                              )
                                                            })()}
                                                          </div>
                                                        </div>
                                                      </div>

                                                      {/* Documents for this leg - Integrated Design */}
                                                      {leg.documents && showDocuments && leg.documents.length > 0 && (
                                                        <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-1.5">
                                                          {leg.documents.map((doc, docIdx) => {
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
                                                                key={doc.id || `leg-doc-${docIdx}`}
                                                                className="px-3 py-2.5 rounded-xl border border-blue-400/20 bg-blue-400/10 backdrop-blur-md hover:bg-blue-400/20 transition-all group/item shadow-sm cursor-pointer"
                                                                onClick={(e) => { 
                                                                  e.stopPropagation(); 
                                                                  setAttachmentDetail({ 
                                                                    data: { type: 'document', document: doc }, 
                                                                    placeId: place.id,
                                                                    transportLegId: leg.id
                                                                  }) 
                                                                }}
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
                                                                  <span className="material-symbols-outlined text-neutral-500 group-hover/item:text-blue-400 transition-colors">open_in_new</span>
                                                                </div>
                                                              </div>
                                                            );
                                                          })}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              )
                                            })}
                                            {(() => {
                                              const prevPlace = globalPlaceIndex > 0 ? places[globalPlaceIndex - 1] : null;
                                              const isSameLocation = prevPlace && (prevPlace.location === place.location || prevPlace.name === place.name);
                                              const isFirstDayOfStay = day.dayNumber === (place.day || 1);
                                              
                                              if (isEditMode && isFirstDayOfStay && globalPlaceIndex !== 0 && !isSameLocation) {
                                                return (
                                                  <div className="relative flex items-center gap-4 py-2 group/add">
                                                    <div className="relative flex flex-col items-center w-[50px] shrink-0">
                                                      <div className="w-px h-full bg-white/10 absolute left-1/2 -translate-x-1/2 -z-10" />
                                                      <button
                                                        onClick={() => openTransportModal(globalPlaceIndex, 'before', undefined, day.dayNumber)}
                                                        className="w-9 h-9 rounded-full bg-slate-950 border border-dashed border-primary/30 text-primary/60 hover:border-primary/60 hover:text-primary transition-all flex items-center justify-center active:scale-95 shadow-sm group relative z-10"
                                                      >
                                                        <span className="material-symbols-outlined text-sm">commute</span>
                                                        <span className="material-symbols-outlined text-[10px] absolute -top-1 -right-1 w-3 h-3 flex items-center justify-center font-black text-primary bg-slate-950 rounded-full">add</span>
                                                      </button>
                                                    </div>
                                                    <button 
                                                      onClick={() => openTransportModal(globalPlaceIndex, 'before', undefined, day.dayNumber)}
                                                      className="flex items-center gap-2 group/btn"
                                                    >
                                                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 group-hover/btn:text-primary transition-all">Add Transport</span>
                                                    </button>
                                                  </div>
                                                );
                                              }
                                              return null;
                                            })()}
                                          </div>
                                        )
                                      })()}

                                      {/* Place Row */}
                                      <div className="relative flex items-start gap-4 group/row">
                                        {/* Timeline Section with Times */}
                                        <div className="relative flex flex-col items-center w-[50px] shrink-0 z-10">
                                          {/* Continuous connector line */}
                                          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-white/10 -z-10" />

                                          {/* Dot */}
                                          <div className={`relative w-9 h-9 rounded-full flex items-center justify-center border mt-1 shrink-0 transition-all duration-300 ${
                                            isLiveHighlight ? 'bg-primary border-primary shadow-[0_0_15px_rgba(195,244,0,0.4)]' : 'bg-primary/20 border-primary/30 group-hover/row:bg-primary/40 group-hover/row:border-primary/60'
                                          }`}>
                                            <span className={`material-symbols-outlined text-sm transition-colors ${isLiveHighlight ? 'text-slate-950' : 'text-primary group-hover/row:text-white'}`}>location_on</span>
                                          </div>

                                          {/* Arr / Dep badge — only if times exist and it's the correct day */}
                                          {((place.arrival && day.dayNumber === (place.day ?? 1)) || (place.departure && day.dayNumber === ((place.endDay || place.day) ?? 1))) && (
                                            <div className="mt-1.5 flex flex-col items-center gap-0.5">
                                              {(place.arrival && day.dayNumber === (place.day ?? 1)) && (
                                                <div className="flex items-center gap-0.5">
                                                  <span className="text-[8px] text-neutral-500 uppercase font-bold tracking-tighter leading-none">↓</span>
                                                  <span className="text-[10px] font-bold text-white font-mono leading-none">{formatTime(place.arrival || '', timeFormat)}</span>
                                                </div>
                                              )}
                                              {(place.departure && day.dayNumber === ((place.endDay || place.day) ?? 1)) && (
                                                <div className="flex items-center gap-0.5">
                                                  <span className="text-[8px] text-neutral-500 uppercase font-bold tracking-tighter leading-none">↑</span>
                                                  <span className="text-[10px] font-bold text-neutral-400 font-mono leading-none">{formatTime(place.departure || '', timeFormat)}</span>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>


                                        {/* Place Card Column */}
                                        <div className="flex-1 flex flex-col gap-1 min-w-0">
                                          {/* Place Card */}
                                          {showPlaces && (
                                            <div className={`relative group/place-card p-4 rounded-3xl transition-all duration-500 overflow-hidden backdrop-blur-md cursor-pointer border min-w-0 ${
                                              isLiveHighlight 
                                                ? 'bg-primary/5 border-primary shadow-[0_0_30px_rgba(143,244,255,0.1)] ring-1 ring-primary/20' 
                                                : focusedPlaceId === place.id 
                                                  ? 'bg-white/[0.08] border-primary ring-1 ring-primary/30 shadow-[0_0_20px_rgba(143,244,255,0.1)]' 
                                                  : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                                            }`}
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
                                                  <h4 className="text-base font-bold text-white group-hover/place-card:text-primary transition-colors line-clamp-1 leading-tight">{place.name}</h4>
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
                                                {(place.endDay && place.endDay > (place.day ?? 1)) && (
                                                  <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[8px] font-black uppercase tracking-tighter">
                                                    DAY {day.dayNumber - (place.day ?? 1) + 1} OF {(place.endDay - (place.day ?? 1) + 1)}
                                                  </span>
                                                )}
                                              </div>
                                                  {Array.isArray(place.notes) && place.notes.some(n => n.day === day.dayNumber && n.text) && (
                                                    <div className="mt-2.5 pt-2.5 border-t border-white/5 space-y-2.5">
                                                      {place.notes
                                                        .filter(n => n.day === day.dayNumber && n.text)
                                                        .map((note, noteIdx) => (
                                                          <div key={note.id || noteIdx}>
                                                            {renderNoteText(note.text, place, day.dayNumber)}
                                                          </div>
                                                        ))
                                                      }
                                                    </div>
                                                  )}

                                                  {/* Place main photos (Gallery) */}
                                                  {place.photos && place.photos.length > 0 && (day.dayNumber === (place.day ?? 1)) && (
                                                    <div className="mt-2.5 pt-2.5 border-t border-white/5 flex gap-2 overflow-x-auto pb-1 custom-scrollbar scroll-smooth no-scrollbar w-full">
                                                      {place.photos.slice(0, place.photos.length === 6 ? 6 : 5).map((photo, idx) => (
                                                        <div 
                                                          key={idx} 
                                                          className="relative w-24 h-16 rounded-lg border border-white/10 overflow-hidden shrink-0 group/photo cursor-zoom-in"
                                                          onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            openViewer(place.photos!, idx);
                                                          }}
                                                        >
                                                          <img src={typeof photo === 'string' ? photo : (photo as any)?.src?.large || (photo as any)?.src?.medium} className="w-full h-full object-cover transition-transform duration-500 group/photo:scale-110" alt="" />
                                                          {idx === 4 && place.photos!.length > 6 && (
                                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-[2px]">
                                                              <span className="text-white text-xs font-black">+{place.photos!.length - 5}</span>
                                                              <span className="text-white/60 text-[8px] font-bold uppercase tracking-widest mt-0.5">More</span>
                                                            </div>
                                                          )}
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
                                                const checkInDay = (acc.checkInDay || place.day) ?? 1
                                                const checkOutDay = (acc.checkOutDay || place.endDay || place.day) ?? 1
                                                return day.dayNumber >= checkInDay && day.dayNumber <= checkOutDay
                                              }) && showAccommodations) || (place.events?.length > 0 && showEvents) || (place.documents?.length > 0 && showDocuments) || (place.links?.length > 0 && showLinks) || isEditMode ? "flex flex-col gap-2.5 mt-2.5 pt-2.5 border-t border-white/5" : ""}>

                                                {place.accommodations?.filter(acc => {
                                                  const checkInDay = (acc.checkInDay || place.day) ?? 1
                                                  const checkOutDay = (acc.checkOutDay || place.endDay || place.day) ?? 1
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
                                                             const start = (acc.checkInDay || place.day) ?? 1
                                                             const end = (acc.checkOutDay || place.endDay || place.day) ?? 1
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
                                                          {acc.photos.slice(0, acc.photos.length === 4 ? 4 : 3).map((p, i) => (
                                                            <div 
                                                              key={i} 
                                                              className="relative w-12 h-12 rounded-lg border-2 border-slate-900 bg-neutral-800 overflow-hidden shadow-lg rotate-3 group-hover/item:rotate-0 transition-all"
                                                            >
                                                              <img src={typeof p === 'string' ? p : (p as any)?.src?.medium} className="w-full h-full object-cover" alt="" />
                                                              {i === 2 && acc.photos!.length > 4 && (
                                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                                  <span className="text-white text-[10px] font-black">+{acc.photos!.length - 3}</span>
                                                                </div>
                                                              )}
                                                            </div>
                                                          ))}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}

                                                {/* Activities for this place */}
                                                {place.events && showEvents && place.events
                                                  .filter(event => {
                                                    const start = (event.day || (event.date ? null : place.day)) ?? 1;
                                                    const end = event.endDay || start!;
                                                    if (start !== null) return day.dayNumber >= start && day.dayNumber <= end;
                                                    return new Date(event.date!).toISOString().split('T')[0] === day.date.toISOString().split('T')[0];
                                                  })
                                                  .map((event, eventIdx) => (
                                                  <div
                                                    key={`event-${eventIdx}`}
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
                                                                  const start = (event.day || place.day) ?? 1
                                                                  const end = (event.endDay || event.day || place.day) ?? 1
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
                                                          {event.photos.slice(0, event.photos.length === 4 ? 4 : 3).map((p, i) => (
                                                            <div 
                                                              key={i} 
                                                              className="relative w-12 h-12 rounded-lg border-2 border-slate-900 bg-neutral-800 overflow-hidden shadow-lg -rotate-3 group-hover/item:rotate-0 transition-all"
                                                            >
                                                              <img src={typeof p === 'string' ? p : (p as any)?.src?.medium} className="w-full h-full object-cover" alt="" />
                                                              {i === 2 && event.photos!.length > 4 && (
                                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                                  <span className="text-white text-[10px] font-black">+{event.photos!.length - 3}</span>
                                                                </div>
                                                              )}
                                                            </div>
                                                          ))}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}

                                                {/* Documents for this place */}
                                                {place.documents && showDocuments && place.documents
                                                  .filter(doc => {
                                                    const start = (doc.day || place.day) ?? 1;
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
                                                          <span className="material-symbols-outlined text-neutral-500 group-hover/item:text-blue-400 transition-colors">open_in_new</span>
                                                        </div>
                                                      </div>
                                                    )
                                                  })
                                                }

                                                {/* Links for this place */}
                                                {place.links && showLinks && place.links
                                                  .filter(link => {
                                                    const start = (link.day || place.day) ?? 1;
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
                                                  })
                                                }

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
                                          .sort((a,b) => (a.departureDay ?? 1) - (b.departureDay ?? 1) || (a.departure || '').localeCompare(b.departure || '')) || []
                                        
                                        // Pin connector to departureDay of first leg if set, otherwise last day of stay
                                        const anchorDay = (place.endDay || place.day) || 1
                                        const isAnchorDay = day.dayNumber === anchorDay

                                        if (legs.length === 0 && !isEditMode) return null
                                        const shouldShowSection = (showTransports || isEditMode) && isAnchorDay;
                                        if (!shouldShowSection && legs.length === 0) return null;

                                        return (
                                          <></>
                                        )
                                      })()}

                                      </div>
                                    )
                                  })}


                                {/* Add Place Button at the end of the timeline */}
                                {isEditMode && !(allDays[dayIndex + 1]?.places?.[0]?.id === day.places[day.places.length - 1]?.id) ? (
                                  <div className="relative flex items-center gap-4 py-2 group/add">
                                    <div className="relative flex flex-col items-center w-[50px] shrink-0">
                                      <div className="w-px h-full bg-white/10 absolute left-1/2 -translate-x-1/2 -z-10" />
                                      <button
                                        onClick={() => {
                                          setNewPlaceDay(day.dayNumber)
                                          handleOpenAddPlace()
                                        }}
                                        className="w-9 h-9 rounded-full bg-slate-950 border border-dashed border-primary/30 text-primary/60 hover:border-primary/60 hover:text-primary transition-all flex items-center justify-center active:scale-95 shadow-sm group relative z-10"
                                      >
                                        <span className="material-symbols-outlined text-sm transition-transform group-hover:scale-110">add_location</span>
                                        <span className="material-symbols-outlined text-[10px] absolute -top-1 -right-1 w-3 h-3 flex items-center justify-center font-black text-primary bg-slate-950 rounded-full">add</span>
                                      </button>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        setNewPlaceDay(day.dayNumber)
                                        handleOpenAddPlace()
                                      }}
                                      className="flex items-center gap-2 group/btn"
                                    >
                                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 group-hover/btn:text-primary transition-all">Add Place</span>
                                    </button>
                                  </div>
                                ) : null}
                              </>
                             )}
                             </div>
                          )
                        })()}
                      </div>
                      ))}
                      {/* End of Trip Connection Block */}
                      {isEditMode && places.length > 0 && (
                        (() => {
                          const lastPlace = places[places.length - 1];
                          const globalPlaceIndex = places.length - 1;
                          const targetId = 'home';
                          const legs = lastPlace.transport?.filter(t => t.to === targetId && t.from === lastPlace.id)
                            .sort((a,b) => (a.departureDay ?? 1) - (b.departureDay ?? 1) || (a.departure || '').localeCompare(b.departure || '')) || []
                          const lastDay = allDays.length;

                          return (
                            <div className="relative ml-[15px] pb-8">
                                <div className="space-y-1">
                                  {/* Render existing legs back home */}
                                  {legs.map((leg) => {
                                    const modeIcon = transportModeIcon(leg.type)
                                    const isInboundLive = getTransportLiveStatus(leg, lastDay)
                                    const isFocused = focusedTransportId === leg.id
                                    const isHighlighted = isInboundLive || isFocused

                                    return (
                                      <div key={leg.id} id={`leg-${leg.id}`} className="relative flex items-center gap-4 group/leg">
                                        <div className="relative flex flex-col items-center w-[50px] shrink-0 h-full">
                                          <div className={`w-px h-full ${isHighlighted ? 'bg-primary/40' : 'bg-white/10'} absolute left-1/2 -translate-x-1/2 -z-10`} />
                                          <div className={`relative w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                                            isHighlighted ? 'bg-primary border-primary shadow-[0_0_15px_rgba(195,244,0,0.4)]' : 'bg-neutral-900 border-white/10 group-hover/leg:border-primary/40 shadow-sm'
                                          }`}>
                                            <span className={`material-symbols-outlined text-sm ${isHighlighted ? 'text-slate-950' : 'text-neutral-500 group-hover/leg:text-primary'}`}>{modeIcon}</span>
                                          </div>
                                        </div>
                                        <div className="flex-1 py-1">
                                          <div 
                                            className={`relative group/leg-card p-4 rounded-2xl transition-all duration-500 overflow-hidden border-l-4 ${
                                              isHighlighted 
                                                ? 'bg-primary/5 border-primary shadow-[0_0_30px_rgba(195,244,0,0.1)] ring-1 ring-primary/20 border-l-primary' 
                                                : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] border-l-white/20 hover:border-l-primary/40'
                                            } border-y border-r backdrop-blur-sm cursor-pointer shadow-lg`}
                                            onClick={() => openTransportModal(globalPlaceIndex, 'after', leg.id, lastDay)}
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-white group-hover/leg-card:text-primary transition-colors line-clamp-1 leading-tight">
                                                  {leg.title || transportModeLabel(leg.type)}
                                                </h4>
                                                <div className="flex items-center gap-2 text-white/50 text-[10px] font-mono mt-0.5 leading-none">
                                                  <span>D{leg.departureDay ?? lastDay}</span>
                                                  <span className="opacity-30">→</span>
                                                  <span>D{leg.arrivalDay ?? lastDay}</span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}

                                  <div className="relative flex items-center gap-4 group/add">
                                    <div className="relative flex flex-col items-center w-[50px] shrink-0">
                                      <div className="w-px h-full bg-white/10 absolute left-1/2 -translate-x-1/2 -z-10" />
                                      <button
                                        onClick={() => openTransportModal(globalPlaceIndex, 'after', undefined, lastDay)}
                                        className="w-9 h-9 rounded-full bg-slate-950 border border-dashed border-primary/30 text-primary/60 hover:border-primary/60 hover:text-primary transition-all flex items-center justify-center active:scale-95 shadow-sm group relative z-10"
                                      >
                                        <span className="material-symbols-outlined text-sm">home_pin</span>
                                        <span className="material-symbols-outlined text-[10px] absolute -top-1 -right-1 w-3 h-3 flex items-center justify-center font-black text-primary bg-slate-950 rounded-full">add</span>
                                      </button>
                                    </div>
                                    <button 
                                      onClick={() => openTransportModal(globalPlaceIndex, 'after', undefined, lastDay)}
                                      className="flex items-center gap-2 group/btn"
                                    >
                                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 group-hover/btn:text-primary transition-all">Add Return Transport</span>
                                    </button>
                                  </div>

                                  <div className="relative flex items-center gap-4 group/add">
                                    <div className="relative flex flex-col items-center w-[50px] shrink-0">
                                      <div className="w-px h-full bg-white/10 absolute left-1/2 -translate-x-1/2 -z-10" />
                                      <button
                                        onClick={() => handleAddHome(legs[0]?.toLocation || legs[0]?.to || '', lastDay, 'end')}
                                        className="w-9 h-9 rounded-full bg-slate-950 border border-dashed border-primary/30 text-primary/60 hover:border-primary/60 hover:text-primary transition-all flex items-center justify-center active:scale-95 shadow-sm group relative z-10"
                                      >
                                        <span className="material-symbols-outlined text-sm transition-transform group-hover:scale-110">home</span>
                                        <span className="material-symbols-outlined text-[10px] absolute -top-1 -right-1 w-3 h-3 flex items-center justify-center font-black text-primary bg-slate-950 rounded-full">add</span>
                                      </button>
                                    </div>
                                    <button 
                                      onClick={() => handleAddHome(legs[0]?.toLocation || legs[0]?.to || '', lastDay, 'end')}
                                      className="flex items-center gap-2 group/btn"
                                    >
                                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 group-hover/btn:text-primary transition-all">Return to Home</span>
                                    </button>
                                  </div>
                                </div>
                            </div>
                          )
                        })()
                      )}

                      <div className="h-4 w-px bg-white/20 mx-auto"></div>

                    </div>
                  )}
                </div>
              </div>
  
        </div>

            {/* Resize Handle */}
            {showMap && !isMobile && (
              <div 
                className={`hidden lg:flex absolute top-0 bottom-0 z-50 cursor-col-resize group items-center justify-center w-8 -translate-x-1/2 hover:opacity-100 transition-opacity ${isResizing ? 'opacity-100' : 'opacity-0'}`}
                style={{ left: `${leftPanelWidth}%` }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                }}
              >
                <div className={`w-0.5 h-full transition-colors ${isResizing ? 'bg-primary' : 'bg-primary/20 group-hover:bg-primary/50'} shadow-[0_0_15px_rgba(143,245,255,0.3)]`} />
                <div className="absolute top-1/2 -translate-y-1/2 w-6 h-10 rounded-full bg-neutral-900 border border-white/10 flex flex-col items-center justify-center gap-0.5 shadow-xl">
                  <div className="w-0.5 h-3 bg-white/20 rounded-full" />
                  <div className="w-0.5 h-3 bg-white/20 rounded-full" />
                </div>
              </div>
            )}

            {showMap && !isMobile && (
              <div className={`min-w-0 overflow-hidden lg:sticky lg:top-24 h-fit lg:pl-4 transition-all duration-500 ${isEditMode ? 'scale-[0.99] origin-left' : 'scale-100'}`}>
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
                      onMarkerClick={focusPlace}
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
      </div>
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
                      value={eventDay ?? 1}
                      onChange={(e) => {
                        const d = parseInt(e.target.value)
                        setEventDay(d)
                        if (eventEndDay && eventEndDay < d) setEventEndDay(d)
                      }}
                      className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded text-white focus:border-primary outline-none text-sm cursor-pointer"
                    >
                      {(() => {
                        const place = places.find(p => p.id === eventPlaceId)
                        const start = place?.day ?? 1
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
                      value={(eventEndDay || eventDay) ?? 1}
                      onChange={(e) => setEventEndDay(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded text-white focus:border-primary outline-none text-sm cursor-pointer"
                    >
                      {(() => {
                        const place = places.find(p => p.id === eventPlaceId)
                        const start = place?.day ?? 1
                        const end = place?.endDay || start
                        return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(d => (
                          <option key={d} value={d} disabled={d < (eventDay ?? 1)}>Day {d}</option>
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
                                ? { 
                                    ...p, 
                                    notes: [
                                      ...(p.notes || []), 
                                      { 
                                        id: Date.now().toString(), 
                                        day: p.day || 1, 
                                        text: attachmentNoteText.trim() 
                                      }
                                    ] 
                                  }
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

      {/* Edit Mode Background Overlay (Mario Maker style blueprint) */}
      <div 
        className={`fixed inset-0 pointer-events-none transition-all duration-1000 ease-in-out z-0 ${
          isEditMode ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          backgroundPosition: 'center center'
        }}
      />

      {/* Construction Tapes for Edit Mode - Unified with Modal Style */}
      {/* Top Tape */}
      <div 
        className={`fixed top-16 left-0 right-0 h-2 z-40 overflow-hidden backdrop-blur-sm bg-black/20 border-b border-yellow-500/20 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isEditMode ? 'translate-y-0' : '-translate-y-[calc(100%+64px)]'
        }`}
      >
        <div 
          className="w-[200%] h-full animate-scroll-tape-left opacity-90"
          style={{
            background: 'repeating-linear-gradient(45deg, #facc15, #facc15 12px, #000 12px, #000 24px)'
          }}
        />
      </div>
      
      {/* Bottom Tape */}
      <div 
        className={`fixed bottom-0 left-0 right-0 h-2 z-[2000] overflow-hidden backdrop-blur-sm bg-black/20 border-t border-yellow-500/20 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isEditMode ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div 
          className="w-[200%] h-full animate-scroll-tape-right opacity-90"
          style={{
            background: 'repeating-linear-gradient(45deg, #facc15, #facc15 12px, #000 12px, #000 24px)'
          }}
        />
      </div>

      {isPlaceDetailModalOpen && editingPlaceForDetail && trip && (
        <PlaceDetailModal
          key={editingPlaceForDetail.id}
          place={editingPlaceForDetail}
          initialDay={placeDetailInitialDay}
          tripStartDate={trip.startDate}
          tripEndDate={trip.endDate || trip.startDate}
          isEditMode={isEditMode}
          minDay={placeDetailBounds?.minDay}
          minTime={placeDetailBounds?.minTime}
          maxDay={placeDetailBounds?.maxDay}
          maxTime={placeDetailBounds?.maxTime}
          allPlaces={places}
          onClose={() => {
            setFocusedPlaceId(null)
            setIsPlaceDetailModalOpen(false)
            setEditingPlaceForDetail(null)
            setInitialAttachmentDetail(null)
          }}
          onDelete={() => {
            setFocusedPlaceId(null)
            deletePlace(editingPlaceForDetail.id)
            setIsPlaceDetailModalOpen(false)
            setEditingPlaceForDetail(null)
          }}
          onSave={async (updatedPlace) => {
            await updateTripContext({ ...trip, places: places.map(p => p.id === updatedPlace.id ? updatedPlace : p) })
            const updatedTrips = await loadTrips()
            const found = updatedTrips.find(t => t.id === id)
            if (found) {
              setTrip(found)
              setPlaces(found.places || [])
            }
          }}
          onOpenTransport={onOpenTransportFromMap}
          onEditLocation={() => setIsPlaceSearchOpen(true)}
          initialAttachmentDetail={initialAttachmentDetail || undefined}
          mapStyle={trip.mapStyle}
          timeFormat={timeFormat}
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
          timeFormat={timeFormat}
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
                  day: (payload.day || p.day) ?? 1
                }
                return { ...p, notes: Array.isArray(p.notes) ? [...p.notes, newNote] : [newNote] }
              }
              if (payload.type === 'event' && payload.eventTitle) {
                const newEvent: TripEvent = {
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
                  day: (payload.day || p.day) ?? 1,
                  endDay: (payload.eventEndDay || payload.day || p.endDay || p.day) ?? 1,
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
                  day: (payload.day || p.day) ?? 1,
                }
                return { ...p, documents: [...(p.documents || []), newDoc] }
              }
              if (payload.type === 'link' && payload.linkUrl) {
                const newLink: PlaceLink = {
                  id: Date.now().toString(),
                  title: payload.linkTitle || payload.linkUrl,
                  url: payload.linkUrl,
                  day: (payload.day || p.day) ?? 1,
                }
                return { ...p, links: [...(p.links || []), newLink] }
              }
              if (payload.type === 'accommodation' && payload.accName) {
                const newAcc: Accommodation = {
                  id: Date.now().toString(),
                  name: payload.accName,
                  type: payload.accType || 'hotel',
                  checkIn: payload.accCheckIn || '',
                  checkInDay: (payload.accCheckInDay || p.day) ?? 1,
                  checkOut: payload.accCheckOut || '',
                  checkOutDay: (payload.accCheckOutDay || p.endDay || p.day) ?? 1,
                  address: payload.accLocation || '',
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
        <ModalBackdrop onClick={() => setIsEditModalOpen(false)} className="z-[100]">
          <ModalContainer 
            size="lg" 
            tint="rgba(34, 211, 238, 0.05)"
          >
            <ModalHeader 
              title="Edit Trip Details" 
              subtitle="Update your trip's identity and schedule"
              onClose={() => setIsEditModalOpen(false)}
              leading={
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg text-primary">edit_note</span>
                </div>
              }
            />
            <ModalContent className="!p-0">
              <div ref={editModalScrollRef} className="relative p-6 md:p-8">
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
                  hideActions={true}
                  compact={true}
                  onValidationChange={setIsEditFormValid}
                  onWallpaperChange={setPreviewWallpaper}
                  onDelete={() => {
                    deleteTrip(trip!.id)
                    window.location.href = '/'
                  }}
                />
              </div>
            </ModalContent>
            <ModalFooter>
              <Button 
                variant="modal-danger" 
                icon="delete" 
                onClick={() => {
                  if (confirm("Are you sure you want to delete this trip?")) {
                    deleteTrip(trip!.id)
                    window.location.href = '/'
                  }
                }}
              >
                Delete
              </Button>
              <div className="flex-1" />
              <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button 
                variant="modal-primary" 
                icon="save" 
                type="submit" 
                form="trip-edit-form"
                disabled={!isEditFormValid || isEditSubmitting}
              >
                {isEditSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </ModalFooter>
          </ModalContainer>
        </ModalBackdrop>
      )}
      {/* Trip View Settings Modal */}
      {isViewSettingsOpen && (
        <ModalBackdrop onClick={() => setIsViewSettingsOpen(false)}>
          <ModalContainer size="md">
            <ModalHeader title="Trip View Settings" onClose={() => setIsViewSettingsOpen(false)} />
            <ModalContent>
              <div className="space-y-6">
                {/* 1. Core Visibility */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                    <span className="w-4 h-px bg-neutral-800" />
                    Visibility
                    <span className="flex-1 h-px bg-neutral-800" />
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button 
                      onClick={() => {
                        const next = !showTransports
                        setShowTransports(next)
                        if (trip) {
                          const updated = { ...trip, settings: { ...trip.settings, showTransports: next } }
                          setTrip(updated)
                          updateTripContext(updated)
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${showTransports ? 'bg-primary/5 border-primary/20' : 'bg-neutral-900/40 border-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-[20px] ${showTransports ? 'text-primary' : 'text-neutral-600'}`}>directions_bus</span>
                        <span className={`text-xs font-bold ${showTransports ? 'text-white' : 'text-neutral-500'}`}>Transports</span>
                      </div>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${showTransports ? 'bg-primary' : 'bg-neutral-700'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showTransports ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </div>
                    </button>

                    <button 
                      onClick={() => {
                        const next = !showPlaces
                        setShowPlaces(next)
                        if (trip) {
                          const updated = { ...trip, settings: { ...trip.settings, showPlaces: next } }
                          setTrip(updated)
                          updateTripContext(updated)
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${showPlaces ? 'bg-primary/5 border-primary/20' : 'bg-neutral-900/40 border-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-[20px] ${showPlaces ? 'text-primary' : 'text-neutral-600'}`}>location_on</span>
                        <span className={`text-xs font-bold ${showPlaces ? 'text-white' : 'text-neutral-500'}`}>Places</span>
                      </div>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${showPlaces ? 'bg-primary' : 'bg-neutral-700'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showPlaces ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => {
                        const next = !showMap
                        setShowMap(next)
                        if (trip) {
                          const updated = { ...trip, settings: { ...trip.settings, showMap: next } }
                          setTrip(updated)
                          updateTripContext(updated)
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${showMap ? 'bg-primary/5 border-primary/20' : 'bg-neutral-900/40 border-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-[20px] ${showMap ? 'text-primary' : 'text-neutral-600'}`}>map</span>
                        <span className={`text-xs font-bold ${showMap ? 'text-white' : 'text-neutral-500'}`}>Map View</span>
                      </div>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${showMap ? 'bg-primary' : 'bg-neutral-700'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showMap ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </div>
                    </button>

                    <button 
                      onClick={() => {
                        const next = !showNotes
                        setShowNotes(next)
                        if (trip) {
                          const updated = { ...trip, settings: { ...trip.settings, showNotes: next } }
                          setTrip(updated)
                          updateTripContext(updated)
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${showNotes ? 'bg-primary/5 border-primary/20' : 'bg-neutral-900/40 border-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-[20px] ${showNotes ? 'text-primary' : 'text-neutral-600'}`}>notes</span>
                        <span className={`text-xs font-bold ${showNotes ? 'text-white' : 'text-neutral-500'}`}>Notes</span>
                      </div>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${showNotes ? 'bg-primary' : 'bg-neutral-700'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showNotes ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </div>
                    </button>
                  </div>

                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/5 transition-opacity ${!showPlaces ? 'opacity-50 pointer-events-none' : ''}`}>
                    <button 
                      onClick={() => {
                        const next = !showAccommodations
                        setShowAccommodations(next)
                        if (trip) {
                          const updated = { ...trip, settings: { ...trip.settings, showAccommodations: next } }
                          setTrip(updated)
                          updateTripContext(updated)
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${showAccommodations ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-neutral-900/40 border-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-[20px] ${showAccommodations ? 'text-yellow-400' : 'text-neutral-600'}`}>bed</span>
                        <span className={`text-xs font-bold ${showAccommodations ? 'text-white' : 'text-neutral-500'}`}>Hotels</span>
                      </div>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${showAccommodations ? 'bg-yellow-500' : 'bg-neutral-700'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showAccommodations ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </div>
                    </button>

                    <button 
                      onClick={() => {
                        const next = !showEvents
                        setShowEvents(next)
                        if (trip) {
                          const updated = { ...trip, settings: { ...trip.settings, showEvents: next } }
                          setTrip(updated)
                          updateTripContext(updated)
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${showEvents ? 'bg-red-500/5 border-red-500/20' : 'bg-neutral-900/40 border-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-[20px] ${showEvents ? 'text-red-400' : 'text-neutral-600'}`}>flag</span>
                        <span className={`text-xs font-bold ${showEvents ? 'text-white' : 'text-neutral-500'}`}>Events</span>
                      </div>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${showEvents ? 'bg-red-500' : 'bg-neutral-700'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showEvents ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </div>
                    </button>

                    <button 
                      onClick={() => {
                        const next = !showDocuments
                        setShowDocuments(next)
                        if (trip) {
                          const updated = { ...trip, settings: { ...trip.settings, showDocuments: next } }
                          setTrip(updated)
                          updateTripContext(updated)
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${showDocuments ? 'bg-blue-500/5 border-blue-500/20' : 'bg-neutral-900/40 border-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-[20px] ${showDocuments ? 'text-blue-400' : 'text-neutral-600'}`}>description</span>
                        <span className={`text-xs font-bold ${showDocuments ? 'text-white' : 'text-neutral-500'}`}>Files</span>
                      </div>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${showDocuments ? 'bg-blue-500' : 'bg-neutral-700'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showDocuments ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </div>
                    </button>

                    <button 
                      onClick={() => {
                        const next = !showLinks
                        setShowLinks(next)
                        if (trip) {
                          const updated = { ...trip, settings: { ...trip.settings, showLinks: next } }
                          setTrip(updated)
                          updateTripContext(updated)
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${showLinks ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-neutral-900/40 border-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-[20px] ${showLinks ? 'text-cyan-400' : 'text-neutral-600'}`}>link</span>
                        <span className={`text-xs font-bold ${showLinks ? 'text-white' : 'text-neutral-500'}`}>Links</span>
                      </div>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${showLinks ? 'bg-cyan-500' : 'bg-neutral-700'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showLinks ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Preferences */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                    <span className="w-4 h-px bg-neutral-800" />
                    Preferences
                    <span className="flex-1 h-px bg-neutral-800" />
                  </h4>
                  
                  <div className="space-y-3">
                    {/* Time Format */}
                    <div className="flex items-center justify-between p-3 rounded-2xl border border-white/5 bg-neutral-900/40">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[20px] text-neutral-500">schedule</span>
                        <span className="text-xs font-bold text-neutral-400">Time Format</span>
                      </div>
                      <div className="flex bg-neutral-800 p-0.5 rounded-full border border-white/5">
                        <button 
                          onClick={() => {
                            setTimeFormat('12h')
                            timeFormatRef.current = '12h'
                            if (trip) {
                              const updated = { ...trip, settings: { ...trip.settings, timeFormat: '12h' as const } }
                              setTrip(updated)
                              updateTripContext(updated)
                            }
                          }}
                          className={`px-3 py-1 text-[10px] font-black rounded-full transition-all ${timeFormat === '12h' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                        >
                          12H
                        </button>
                        <button 
                          onClick={() => {
                            setTimeFormat('24h')
                            timeFormatRef.current = '24h'
                            if (trip) {
                              const updated = { ...trip, settings: { ...trip.settings, timeFormat: '24h' as const } }
                              setTrip(updated)
                              updateTripContext(updated)
                            }
                          }}
                          className={`px-3 py-1 text-[10px] font-black rounded-full transition-all ${timeFormat === '24h' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                        >
                          24H
                        </button>
                      </div>
                    </div>

                    {/* Distance Units */}
                    <div className="flex items-center justify-between p-3 rounded-2xl border border-white/5 bg-neutral-900/40">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[20px] text-neutral-500">straighten</span>
                        <span className="text-xs font-bold text-neutral-400">Distance Units</span>
                      </div>
                      <div className="flex bg-neutral-800 p-0.5 rounded-full border border-white/5">
                        <button 
                          onClick={() => {
                            setDistanceUnit('metric')
                            if (trip) {
                              const updated = { ...trip, settings: { ...trip.settings, distanceUnit: 'metric' as const } }
                              setTrip(updated)
                              updateTripContext(updated)
                            }
                          }}
                          className={`px-3 py-1 text-[10px] font-black rounded-full transition-all ${distanceUnit === 'metric' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                        >
                          METRIC
                        </button>
                        <button 
                          onClick={() => {
                            setDistanceUnit('imperial')
                            if (trip) {
                              const updated = { ...trip, settings: { ...trip.settings, distanceUnit: 'imperial' as const } }
                              setTrip(updated)
                              updateTripContext(updated)
                            }
                          }}
                          className={`px-3 py-1 text-[10px] font-black rounded-full transition-all ${distanceUnit === 'imperial' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                        >
                          IMPERIAL
                        </button>
                      </div>
                    </div>

                    {/* Compact Mode */}
                    <button 
                      onClick={() => {
                        const next = !compactMode
                        setCompactMode(next)
                        if (trip) {
                          const updated = { ...trip, settings: { ...trip.settings, compactMode: next } }
                          setTrip(updated)
                          updateTripContext(updated)
                        }
                      }}
                      className={`flex w-full items-center justify-between p-3 rounded-2xl border transition-all ${compactMode ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-neutral-900/40 border-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-[20px] ${compactMode ? 'text-yellow-400' : 'text-neutral-500'}`}>compress</span>
                        <span className={`text-xs font-bold ${compactMode ? 'text-white' : 'text-neutral-500'}`}>Compact Mode</span>
                      </div>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${compactMode ? 'bg-yellow-500' : 'bg-neutral-700'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${compactMode ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                   <p className="text-[10px] text-neutral-600 text-center uppercase tracking-widest font-bold">Trip Settings are saved locally</p>
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
            placeStartDay={place?.day ?? 1}
            placeEndDay={(place?.endDay || place?.day) ?? 1}
            tripStartDate={trip?.startDate}
            tripEndDate={trip?.endDate}
            totalDays={allDays.length || 1}
            allPlaces={places}
            mapStyle={trip?.mapStyle}
            timeFormat={timeFormat}
            onClose={() => setAttachmentDetail(null)}
            onDelete={async () => {
              if (!place) { setAttachmentDetail(null); return }
              let updatedPlaces = places
              if (attachmentDetail.transportLegId) {
                updatedPlaces = places.map(p => p.id === placeId ? {
                  ...p,
                  transport: (p.transport || []).map(t => t.id === attachmentDetail.transportLegId ? {
                    ...t,
                    documents: (t.documents || []).filter(d => d.id !== attachmentDetail.data.document!.id)
                  } : t)
                } : p)
              } else if (attachmentDetail.data.type === 'event' && attachmentDetail.data.event) {
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
              if (attachmentDetail.transportLegId) {
                updatedPlaces = places.map(p => p.id === placeId ? {
                  ...p,
                  transport: (p.transport || []).map(t => t.id === attachmentDetail.transportLegId ? {
                    ...t,
                    documents: (t.documents || []).map(d => d.id === updated.document!.id ? updated.document! : d)
                  } : t)
                } : p)
              } else if (updated.type === 'event' && updated.event) {
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
      <DiscoveryDetailModal
        isOpen={isDiscoveryDetailModalOpen}
        onClose={() => setIsDiscoveryDetailModalOpen(false)}
        discovery={selectedDiscovery}
        mapStyle={trip?.mapStyle}
        onAdd={(d) => {
          handleAddDiscovery(d)
          setIsDiscoveryDetailModalOpen(false)
        }}
      />
    </div>
  )
}
