export interface Document {
  id: string
  name: string
  type: 'ticket' | 'reservation' | 'passport' | 'visa' | 'link' | 'other'
  url?: string
  file?: string // base64
  mimeType?: string
  day?: number
  endDay?: number
  size?: number
}

export interface Link {
  id: string
  title: string
  url: string
  thumbnail?: string
  day?: number
  endDay?: number
}

export interface Attachment {
  id: string
  type: 'event' | 'transport' | 'place' | 'accommodation' | 'note'
  
  // For all types
  title: string
  description?: string
  startTime?: string
  endTime?: string
  
  // For events
  location?: string
  category?: 'activity' | 'dining' | 'sightseeing' | 'other'
  
  // For transport
  transportMode?: TransportMode | 'train' | 'ferry' | 'other'
  from?: string
  to?: string
  departure?: string
  arrival?: string
  duration?: string
  provider?: string
  
  // For places
  placeLocation?: string
  country?: string
  lat?: number
  lng?: number
  
  // For accommodation
  accommodationType?: 'hotel' | 'airbnb' | 'hostel' | 'other'
  checkIn?: string
  checkOut?: string
  address?: string
  
  // Common
  notes?: string
  documents: Document[]
  links: string[]
  photos?: string[]
  icon?: string
}

export interface DayItinerary {
  day: number
  date: string
  attachments: Attachment[]
}

export interface Event {
  id: string
  title: string
  description?: string
  time?: string
  endTime?: string
  date: string
  type: 'activity' | 'dining' | 'transport' | 'sightseeing' | 'other'
  location?: string
  emoji?: string
  documents: Document[]
  photos?: string[]
  day?: number
  endDay?: number
  lat?: number
  lng?: number
  icon?: string
  photoDays?: (number | null)[]
}

export interface Accommodation {
  id: string
  name: string
  type: 'hotel' | 'airbnb' | 'hostel' | 'other'
  checkIn: string
  checkInDay?: number
  checkOut: string
  checkOutDay?: number
  address?: string
  documents: Document[]
  photos?: string[]
  lat?: number
  lng?: number
  icon?: string
  description?: string
  link?: string
  photoDays?: (number | null)[]
}

export interface Note {
  id?: string
  day: number
  text: string
}

/** User-selectable modes between places. Legacy JSON may still use train / ferry / other. */
export type TransportMode = 'flight' | 'rail' | 'bus' | 'car' | 'bike' | 'walk' | 'ship' | 'portal'

export interface Transport {
  id: string
  title?: string
  type: TransportMode | 'train' | 'ferry' | 'other'
  from: string
  to: string
  departure: string
  departureDay?: number
  arrival: string
  arrivalDay?: number
  duration?: string
  provider?: string
  documents: Document[]
  notes?: Note[]
  links?: Link[]
  ticketNumber?: string
  fromLocation?: string
  toLocation?: string
  distance?: string
  photos?: string[]
  photoDays?: (number | null)[]
}

export interface Place {
  id: string
  name: string
  originalName?: string
  location: string
  country: string
  lat?: number
  lng?: number
  emoji?: string
  arrival?: string
  departure?: string
  day?: number
  endDay?: number
  notes: Note[]
  accommodations: Accommodation[]
  events: Event[]
  transport?: Transport[]
  documents: Document[]
  links: Link[]
  photos?: string[]
  photoDays?: (number | null)[]
  type?: string
}

export interface TripSettings {
  compactMode?: boolean
  timeFormat?: '12h' | '24h'
  distanceUnit?: 'metric' | 'imperial'
  timezone?: string
  showTransports?: boolean
  showPlaces?: boolean
  showMap?: boolean
  showAccommodations?: boolean
  showEvents?: boolean
  showDocuments?: boolean
  showLinks?: boolean
  showNotes?: boolean
}

export interface Trip {
  id: string
  title: string
  startDate: string
  endDate?: string
  description?: string
  tags?: string[]
  notes?: string
  photos?: string[] // base64 or URLs
  emoji?: string
  wallpaper?: string // base64 or URL
  mapStyle?: string
  settings?: TripSettings
  places: Place[]
  itinerary?: DayItinerary[] // New calendar-style itinerary
}

import { db } from './db'

const STORAGE_KEY = 'trippi-trips'

export async function loadTrips(): Promise<Trip[]> {
  if (typeof window === 'undefined' || !db) return []
  
  try {
    // 1. Try to load from IndexedDB
    let idbData = await db.get<Trip[]>(STORAGE_KEY)
    if (idbData && idbData.length > 0) {
      // Migrate data if needed
      idbData = idbData.map(migrateTrip)
      return idbData
    }

    // 2. Fallback to localStorage for migration
    const localData = localStorage.getItem(STORAGE_KEY)
    if (localData) {
      try {
        let trips = JSON.parse(localData)
        if (Array.isArray(trips) && trips.length > 0) {
          // Migrate data
          trips = trips.map(migrateTrip)
          // Migrate to IDB
          await db.set(STORAGE_KEY, trips)
          // We keep localStorage for now as a backup, but IDB is primary
          return trips
        }
      } catch (e) {
        console.error('Error parsing localStorage trips', e)
      }
    }
  } catch (e) {
    console.error('Error loading trips from storage', e)
  }
  
  return []
}

function migrateTrip(trip: any): Trip {
  if (!trip.places) return trip
  
  trip.places = trip.places.map((place: any) => {
    // Migrate notes
    if (typeof place.notes === 'string') {
      const oldNotes = place.notes
      const copyAcross = place.copyNotesAcrossDays
      const startDay = place.day || 1
      const endDay = place.endDay || startDay
      place.notes = []
      if (oldNotes) {
        if (copyAcross) {
          for (let d = startDay; d <= endDay; d++) {
            place.notes.push({ day: d, text: oldNotes })
          }
        } else {
          place.notes.push({ day: startDay, text: oldNotes })
        }
      }
      delete place.copyNotesAcrossDays
    }
    
    // Migrate accommodation to accommodations
    if (place.accommodation && !place.accommodations) {
      place.accommodations = [place.accommodation]
      delete place.accommodation
    }
    
    // Ensure accommodations is array
    if (!Array.isArray(place.accommodations)) {
      place.accommodations = []
    }
    
    // Ensure notes is array
    if (!Array.isArray(place.notes)) {
      place.notes = []
    }

    // Fix backwards links where URL was pasted into Title
    if (Array.isArray(place.links)) {
      place.links = place.links.map((link: any) => {
        if (link.title && link.url && typeof link.title === 'string' && typeof link.url === 'string') {
          if (link.title.match(/^https?:\/\//)) {
            // Title looks like a URL. Check if url looks like a label.
            const urlLooksLikeLabel = !link.url.includes('.') || link.url.includes(' ') || link.url.match(/^https?:\/\/[^.]+$/) || link.url.match(/^https?:\/\/.+\s/);
            if (urlLooksLikeLabel) {
              const temp = link.url;
              link.url = link.title;
              link.title = temp.replace(/^https?:\/\//, ''); // Clean up accidental https:// on the label
            }
          }
        }
        return link;
      })
    }
    
    return place
  })
  
  return trip
}

export async function saveTrips(trips: Trip[]) {
  if (typeof window === 'undefined' || !db) return
  
  try {
    // Primary save to IndexedDB
    await db.set(STORAGE_KEY, trips)
    
    // Also try to save a lightweight version to localStorage as backup if possible
    // (excluding large photos/docs to avoid quota errors)
    try {
      const lightweight = trips.map(t => ({
        ...t,
        places: t.places.map(p => ({
          ...p,
          photos: [], // strip photos
          documents: p.documents.map(d => ({ ...d, file: undefined })) // strip blobs
        }))
      }))
      localStorage.setItem(STORAGE_KEY + '-meta', JSON.stringify(lightweight))
    } catch (e) {
      // Ignore localStorage backup failures
    }
  } catch (e) {
    console.error('CRITICAL: Failed to save to IndexedDB', e)
    // Absolute fallback: try localStorage with the full data (will likely fail if quota exceeded)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
    } catch (quotaError) {
      console.error('LocalStorage fallback also failed', quotaError)
      throw quotaError // Re-throw so UI can handle it
    }
  }
}

const emojis = ['🌍', '🏖️', '🏔️', '🏙️', '🌴', '⛰️', '🏕️', '🏝️', '🌄', '🌅']

export async function addTrip(trip: Omit<Trip, 'id'>): Promise<Trip> {
  const trips = await loadTrips()
  const newTrip = {
    ...trip,
    id: Date.now().toString(),
    places: trip.places || []
  }
  if (!newTrip.emoji) {
    newTrip.emoji = emojis[Math.floor(Math.random() * emojis.length)]
  }
  trips.push(newTrip)
  await saveTrips(trips)
  return newTrip
}

export async function updateTrip(id: string, updates: Partial<Trip>) {
  const trips = await loadTrips()
  const index = trips.findIndex(t => t.id === id)
  if (index !== -1) {
    trips[index] = { ...trips[index], ...updates }
    await saveTrips(trips)
  }
}

export async function deleteTrip(id: string) {
  const trips = await loadTrips()
  const filtered = trips.filter(t => t.id !== id)
  await saveTrips(filtered)
}

export async function deleteAllTrips() {
  if (typeof window === 'undefined' || !db) return
  await db.set(STORAGE_KEY, [])
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
}

export async function updatePlace(tripId: string, placeId: string, updates: Partial<Place>) {
  const trips = await loadTrips()
  const tripIndex = trips.findIndex(t => t.id === tripId)
  if (tripIndex !== -1) {
    const placeIndex = trips[tripIndex].places.findIndex(p => p.id === placeId)
    if (placeIndex !== -1) {
      trips[tripIndex].places[placeIndex] = { ...trips[tripIndex].places[placeIndex], ...updates }
      await saveTrips(trips)
    }
  }
}

export async function removePlace(tripId: string, placeId: string) {
  const trips = await loadTrips()
  const tripIndex = trips.findIndex(t => t.id === tripId)
  if (tripIndex !== -1) {
    trips[tripIndex].places = trips[tripIndex].places.filter(p => p.id !== placeId)
    await saveTrips(trips)
  }
}
/** 
 * Automatically ensures a URL has a protocol (defaults to https://).
 * Prevents relative URL issues (e.g. "google.com" becoming "localhost:3000/google.com").
 */
export function normalizeUrl(url: string | undefined): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''
  
  // If it already has a protocol (e.g. http://, https://, mailto:, tel:), return as is
  if (/^[a-zA-Z][a-zA-Z\d.+\-]*:/.test(trimmed)) {
    return trimmed
  }
  
  // Otherwise prefix with https://
  return `https://${trimmed}`
}
