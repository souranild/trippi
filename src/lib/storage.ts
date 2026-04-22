export interface Document {
  id: string
  name: string
  type: 'ticket' | 'reservation' | 'passport' | 'visa' | 'link' | 'other'
  url?: string
  file?: string // base64
}

export interface Link {
  id: string
  title: string
  url: string
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
  date: string
  type: 'activity' | 'dining' | 'transport' | 'sightseeing' | 'other'
  location?: string
  emoji?: string
  documents: Document[]
}

export interface Accommodation {
  id: string
  name: string
  type: 'hotel' | 'airbnb' | 'hostel' | 'other'
  checkIn: string
  checkOut: string
  address?: string
  documents: Document[]
}

/** User-selectable modes between places. Legacy JSON may still use train / ferry / other. */
export type TransportMode = 'flight' | 'rail' | 'bus' | 'car' | 'bike' | 'walk'

export interface Transport {
  id: string
  type: TransportMode | 'train' | 'ferry' | 'other'
  from: string
  to: string
  departure: string
  arrival: string
  duration?: string
  provider?: string
  documents: Document[]
}

export interface Place {
  id: string
  name: string
  location: string
  country: string
  lat?: number
  lng?: number
  arrival?: string
  departure?: string
  day?: number
  notes?: string
  accommodation?: Accommodation
  events: Event[]
  transport?: Transport[]
  documents: Document[]
  links: Link[]
}

export interface Trip {
  id: string
  title: string
  startDate: string
  endDate?: string
  description?: string
  notes?: string
  photos?: string[] // base64 or URLs
  emoji?: string
  wallpaper?: string // base64 or URL
  places: Place[]
  itinerary?: DayItinerary[] // New calendar-style itinerary
}

const STORAGE_KEY = 'trippi-trips'

export function loadTrips(): Trip[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : []
}

export function saveTrips(trips: Trip[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
}

const emojis = ['🌍', '🏖️', '🏔️', '🏙️', '🌴', '⛰️', '🏕️', '🏝️', '🌄', '🌅']

export function addTrip(trip: Omit<Trip, 'id'>): Trip {
  const trips = loadTrips()
  const newTrip = {
    ...trip,
    id: Date.now().toString(),
    places: trip.places || []
  }
  if (!newTrip.emoji) {
    newTrip.emoji = emojis[Math.floor(Math.random() * emojis.length)]
  }
  trips.push(newTrip)
  saveTrips(trips)
  return newTrip
}

export function updateTrip(id: string, updates: Partial<Trip>) {
  const trips = loadTrips()
  const index = trips.findIndex(t => t.id === id)
  if (index !== -1) {
    trips[index] = { ...trips[index], ...updates }
    saveTrips(trips)
  }
}

export function deleteTrip(id: string) {
  const trips = loadTrips()
  const filtered = trips.filter(t => t.id !== id)
  saveTrips(filtered)
}

export function deleteAllTrips() {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
}

export function updatePlace(tripId: string, placeId: string, updates: Partial<Place>) {
  const trips = loadTrips()
  const tripIndex = trips.findIndex(t => t.id === tripId)
  if (tripIndex !== -1) {
    const placeIndex = trips[tripIndex].places.findIndex(p => p.id === placeId)
    if (placeIndex !== -1) {
      trips[tripIndex].places[placeIndex] = { ...trips[tripIndex].places[placeIndex], ...updates }
      saveTrips(trips)
    }
  }
}

export function removePlace(tripId: string, placeId: string) {
  const trips = loadTrips()
  const tripIndex = trips.findIndex(t => t.id === tripId)
  if (tripIndex !== -1) {
    trips[tripIndex].places = trips[tripIndex].places.filter(p => p.id !== placeId)
    saveTrips(trips)
  }
}