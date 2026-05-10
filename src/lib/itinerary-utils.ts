import { Trip, Place, Transport } from './storage'

export type ItineraryItem = 
  | { type: 'place'; data: Place; globalIndex: number }
  | { type: 'transport'; data: Transport; fromPlaceIndex: number; transportIndex: number }

/**
 * Helper to check if a transport leg matches a specific from/to segment.
 * Supports ID matching, Name matching, and lenient fallbacks for AI data.
 */
export function isTransportMatching(
  leg: Transport, 
  fromPlace: Place | 'home', 
  toPlace: Place | 'home'
): boolean {
  const fromId = fromPlace === 'home' ? 'home' : fromPlace.id
  const toId = toPlace === 'home' ? 'home' : toPlace.id
  
  // 1. Strict ID match
  if (leg.from === fromId && leg.to === toId) return true

  // 2. Name-based match (common in AI data)
  const currentName = fromPlace === 'home' ? 'home' : fromPlace.name.toLowerCase().trim()
  const targetName = toPlace === 'home' ? 'home' : toPlace.name.toLowerCase().trim()
  const tFrom = (leg.from || '').toLowerCase().trim()
  const tTo = (leg.to || '').toLowerCase().trim()

  if (tFrom === currentName && tTo === targetName) return true

  // 3. Lenient match: if no from/to is provided, and it's outbound from the 'fromPlace'
  // (Assuming AI associates outbound legs with the departure place)
  if (!leg.from && !leg.to && fromPlace !== 'home') return true

  return false
}

/**
 * Generates a flat, chronological list of all items in the trip.
 * Interleaves places and transport legs logically.
 */
export function getGlobalItinerary(trip: Trip): ItineraryItem[] {
  const queue: ItineraryItem[] = []
  const places = trip.places || []

  places.forEach((place, idx) => {
    // 1. Check for transport legs starting from 'home' to this first place
    if (idx === 0) {
      const inboundLegs = (place.transport || [])
        .filter(t => isTransportMatching(t, 'home', place))
        .sort(sortTransports)
      
      inboundLegs.forEach((leg) => {
        queue.push({ 
          type: 'transport', 
          data: leg, 
          fromPlaceIndex: -1, // representing 'home'
          transportIndex: place.transport!.indexOf(leg)
        })
      })
    }

    // 2. Add the place itself
    queue.push({ type: 'place', data: place, globalIndex: idx })

    // 3. Add all outbound transport legs from this place to the next destination (or home)
    const nextPlace = places[idx + 1]
    const target = nextPlace || 'home'
    
    const outboundLegs = (place.transport || [])
      .filter(t => isTransportMatching(t, place, target))
      .sort(sortTransports)

    outboundLegs.forEach((leg) => {
      queue.push({ 
        type: 'transport', 
        data: leg, 
        fromPlaceIndex: idx,
        transportIndex: place.transport!.indexOf(leg)
      })
    })
  })

  return queue
}

function sortTransports(a: Transport, b: Transport) {
  const dayA = a.departureDay ?? 1
  const dayB = b.departureDay ?? 1
  if (dayA !== dayB) return dayA - dayB
  return (a.departure || '').localeCompare(b.departure || '')
}

/**
 * Returns the "bounds" for a specific item in the itinerary queue.
 * Useful for time validation.
 */
export function getItemBounds(
  queue: ItineraryItem[], 
  currentIndex: number,
  isInsertion: boolean = false
): { 
  minDay: number; 
  minTime: string; 
  maxDay: number; 
  maxTime: string;
} {
  const prev = queue[currentIndex - 1]
  const next = isInsertion ? queue[currentIndex] : queue[currentIndex + 1]

  let minDay = 1
  let minTime = '00:00'
  let maxDay = 999
  let maxTime = '23:59'

  if (prev) {
    if (prev.type === 'place') {
      minDay = (prev.data.endDay || prev.data.day) ?? 1
      minTime = prev.data.departure || ''
    } else {
      minDay = (prev.data.arrivalDay || prev.data.departureDay) ?? 1
      minTime = prev.data.arrival || ''
    }
  }

  if (next) {
    if (next.type === 'place') {
      maxDay = next.data.day ?? 1
      maxTime = next.data.arrival || ''
    } else {
      maxDay = next.data.departureDay ?? 1
      maxTime = next.data.departure || ''
    }
  }

  return { minDay, minTime, maxDay, maxTime }
}

/**
 * Helper to check if a time is after another, accounting for 12h/24h strings
 */
export function isTimeAfter(time1: string, time2: string): boolean {
  if (!time1 || !time2) return true
  
  const toMins = (t: string) => {
    const clean = t.replace(/\s*(AM|PM)/i, '').trim()
    const [h, m] = clean.split(':').map(Number)
    let total = h * 60 + m
    if (t.toLowerCase().includes('pm') && h < 12) total += 12 * 60
    if (t.toLowerCase().includes('am') && h === 12) total -= 12 * 60
    return total
  }

  return toMins(time1) >= toMins(time2)
}

/**
 * Checks if a day/time is within specified bounds.
 */
export function isWithinBounds(
  day: number,
  time: string,
  minDay: number,
  minTime: string,
  maxDay: number,
  maxTime: string
): boolean {
  // Check min bound
  if (day < minDay) return false
  if (day === minDay && minTime && !isTimeAfter(time, minTime)) return false

  // Check max bound
  if (day > maxDay) return false
  if (day === maxDay && maxTime && !isTimeAfter(maxTime, time)) return false

  return true
}

/**
 * Returns a human-readable validation error if a time range is outside bounds.
 */
export function getBoundsError(
  startDay: number,
  startTime: string,
  endDay: number,
  endTime: string,
  minDay: number,
  minTime: string,
  maxDay: number,
  maxTime: string,
  label: string = 'Item'
): string | null {
  if (!isWithinBounds(startDay, startTime, minDay, minTime, maxDay, maxTime)) {
    return `${label} start must be after the previous item (${minDay === startDay ? minTime : 'Day ' + minDay})`
  }
  if (!isWithinBounds(endDay, endTime || startTime, minDay, minTime, maxDay, maxTime)) {
    return `${label} end must be before the next item (${maxDay === endDay ? maxTime : 'Day ' + maxDay})`
  }
  if (endDay < startDay || (endDay === startDay && endTime && !isTimeAfter(endTime, startTime))) {
    return `${label} end must be after its start`
  }
  return null
}
