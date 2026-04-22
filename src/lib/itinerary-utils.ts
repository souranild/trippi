import { Trip, DayItinerary, Attachment, Event, Transport, Place } from './storage'

/**
 * Initialize itinerary from trip dates
 */
export function initializeItinerary(trip: Trip): DayItinerary[] {
  const startDate = new Date(trip.startDate)
  const endDate = trip.endDate ? new Date(trip.endDate) : new Date(trip.startDate)
  
  const days: DayItinerary[] = []
  const currentDate = new Date(startDate)
  let dayNumber = 1
  
  while (currentDate <= endDate) {
    days.push({
      day: dayNumber,
      date: currentDate.toISOString().split('T')[0],
      attachments: []
    })
    
    currentDate.setDate(currentDate.getDate() + 1)
    dayNumber++
  }
  
  return days
}

/**
 * Migrate old event/transport/place structure to new attachment-based itinerary
 */
export function migrateToAttachmentItinerary(trip: Trip): DayItinerary[] {
  const itinerary = initializeItinerary(trip)
  
  // Migrate events from places to attachments
  trip.places.forEach((place) => {
    const dayNumber = place.day || 1
    const dayItinerary = itinerary.find(d => d.day === dayNumber)
    
    if (dayItinerary) {
      // Add place as attachment
      dayItinerary.attachments.push({
        id: place.id,
        type: 'place',
        title: place.name,
        description: place.notes,
        location: place.location,
        placeLocation: place.location,
        country: place.country,
        lat: place.lat,
        lng: place.lng,
        startTime: place.arrival,
        endTime: place.departure,
        documents: [],
        links: []
      })
      
      // Add events
      if (place.events && place.events.length > 0) {
        place.events.forEach((event) => {
          dayItinerary.attachments.push({
            id: event.id,
            type: 'event',
            title: event.title,
            description: event.description,
            startTime: event.time,
            location: event.location,
            category: event.type as 'activity' | 'dining' | 'sightseeing' | 'other',
            documents: event.documents || [],
            links: [],
            notes: ''
          })
        })
      }
      
      // Add transport
      if (place.transport && place.transport.length > 0) {
        place.transport.forEach((transport) => {
          dayItinerary.attachments.push({
            id: transport.id,
            type: 'transport',
            title: `${transport.from} → ${transport.to}`,
            transportMode: transport.type as Attachment['transportMode'],
            from: transport.from,
            to: transport.to,
            departure: transport.departure,
            arrival: transport.arrival,
            duration: transport.duration,
            provider: transport.provider,
            documents: transport.documents || [],
            links: [],
            notes: ''
          })
        })
      }
    }
  })
  
  return itinerary
}

/**
 * Add attachment to a specific day
 */
export function addAttachmentToDay(
  itinerary: DayItinerary[],
  dayNumber: number,
  attachment: Attachment
): DayItinerary[] {
  return itinerary.map(day => {
    if (day.day === dayNumber) {
      return {
        ...day,
        attachments: [...day.attachments, attachment]
      }
    }
    return day
  })
}

/**
 * Remove attachment from a day
 */
export function removeAttachmentFromDay(
  itinerary: DayItinerary[],
  dayNumber: number,
  attachmentId: string
): DayItinerary[] {
  return itinerary.map(day => {
    if (day.day === dayNumber) {
      return {
        ...day,
        attachments: day.attachments.filter(a => a.id !== attachmentId)
      }
    }
    return day
  })
}

/**
 * Move attachment to different day
 */
export function moveAttachmentToDay(
  itinerary: DayItinerary[],
  fromDayNumber: number,
  toDayNumber: number,
  attachmentId: string
): DayItinerary[] {
  let attachment: Attachment | null = null
  
  // Find and remove from source day
  const updated = itinerary.map(day => {
    if (day.day === fromDayNumber) {
      const foundAttachment = day.attachments.find(a => a.id === attachmentId)
      if (foundAttachment) {
        attachment = foundAttachment
      }
      return {
        ...day,
        attachments: day.attachments.filter(a => a.id !== attachmentId)
      }
    }
    return day
  })
  
  // Add to target day
  if (attachment) {
    return updated.map(day => {
      if (day.day === toDayNumber) {
        return {
          ...day,
          attachments: [...day.attachments, attachment!]
        }
      }
      return day
    })
  }
  
  return updated
}

/**
 * Reorder attachments within a day
 */
export function reorderAttachments(
  itinerary: DayItinerary[],
  dayNumber: number,
  fromIndex: number,
  toIndex: number
): DayItinerary[] {
  return itinerary.map(day => {
    if (day.day === dayNumber) {
      const attachments = [...day.attachments]
      const [removed] = attachments.splice(fromIndex, 1)
      attachments.splice(toIndex, 0, removed)
      return {
        ...day,
        attachments
      }
    }
    return day
  })
}

/**
 * Update attachment
 */
export function updateAttachment(
  itinerary: DayItinerary[],
  dayNumber: number,
  attachmentId: string,
  updates: Partial<Attachment>
): DayItinerary[] {
  return itinerary.map(day => {
    if (day.day === dayNumber) {
      return {
        ...day,
        attachments: day.attachments.map(a => {
          if (a.id === attachmentId) {
            return { ...a, ...updates }
          }
          return a
        })
      }
    }
    return day
  })
}

/**
 * Get all attachments of a specific type
 */
export function getAttachmentsByType(
  itinerary: DayItinerary[],
  type: Attachment['type']
): Attachment[] {
  return itinerary.flatMap(day => 
    day.attachments.filter(a => a.type === type)
  )
}

/**
 * Get attachment by ID across all days
 */
export function findAttachment(
  itinerary: DayItinerary[],
  attachmentId: string
): { attachment: Attachment; dayNumber: number } | null {
  for (const day of itinerary) {
    const attachment = day.attachments.find(a => a.id === attachmentId)
    if (attachment) {
      return { attachment, dayNumber: day.day }
    }
  }
  return null
}
