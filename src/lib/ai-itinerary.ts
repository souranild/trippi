import { fetchPlaceImages } from './image-utils'
import { Place, Trip } from './storage'

export const ITINERARY_JSON_FORMAT = `
{
  "places": [
    {
      "name": "Place Name",
       "location": "City, Country",
      "lat": 0.0,
      "lng": 0.0,
      "day": 1,
      "endDay": 1,
      "arrival": "10:00",
      "departure": "12:00",
      "emoji": "📍",
      "notes": ["Note text 1", "Note text 2"],
      "photos": ["https://images.unsplash.com/photo..."],
      "events": [
        {
          "title": "Event Title",
          "description": "Event Description",
          "time": "14:00",
          "endTime": "16:00",
          "type": "activity",
          "photos": ["https://images.unsplash.com/photo..."]
        }
      ],
      "accommodations": [
        {
          "name": "Hotel Name",
          "type": "hotel",
          "checkIn": "15:00",
          "checkOut": "11:00",
          "address": "Hotel Address",
          "photos": ["https://images.unsplash.com/photo..."]
        }
      ],
      "transport": [
        {
          "type": "flight",
          "title": "Flight to Destination",
          "from": "Origin City",
          "to": "Destination City",
          "departure": "08:00",
          "arrival": "09:30",
          "provider": "Airline Name"
        }
      ],
      "links": [
        { "title": "Official Website", "url": "https://example.com" }
      ]
    }
  ]
}
`

export function generateAiPrompt(title: string, startDate: string, endDate: string, existingPlaces: Place[] = [], tags: string[] = []): string {
  const duration = endDate ? `from ${startDate} to ${endDate}` : `starting on ${startDate}`
  const styleContext = tags.length > 0 ? ` with the following vibes: ${tags.join(', ')}` : ''
  
  let currentContext = ""
  if (existingPlaces.length > 0) {
    const contextData = existingPlaces.map(p => ({
      name: p.name,
      location: p.location,
      day: p.day,
      arrival: p.arrival,
      departure: p.departure,
      photos: p.photos || []
    }))
    currentContext = `\n\nI have already started planning this trip and have the following places:\n${JSON.stringify(contextData, null, 2)}\n\nPlease preserve these places and their associated photo URLs in the final JSON. Add more detailed events, transport legs, and accommodations to fill the gaps and make the itinerary comprehensive.`
  }

  return `Generate a detailed travel itinerary for a trip titled "${title}" ${duration}${styleContext}.${currentContext}

Please provide the response ONLY as a JSON object following this exact structure:
${ITINERARY_JSON_FORMAT}

Rules:
1. "day" and "endDay" should be 1-indexed relative to the trip start.
2. "type" for events can be: "activity", "dining", "transport", "sightseeing", "other".
3. "type" for transport can be: "flight", "rail", "bus", "car", "bike", "walk", "ship", "portal".
4. "type" for accommodations can be: "hotel", "airbnb", "hostel", "other".
5. Use consistent 24-hour time format (HH:MM).
6. Ensure the JSON is valid and follow the nesting strictly.
7. Focus on famous landmarks, highly-rated restaurants, and efficient travel routes.
8. If I provided existing photo URLs, make sure to include them in the "photos" array for those places.
9. CRITICAL: For every place, provide the most accurate "lat" and "lng" coordinates possible so they can be mapped correctly.
10. For transport legs, always include the "to" field with the exact name of the destination place from the "places" array to ensure correct mapping.
11. PROMPT FOR IMAGES: For every place, activity, and accommodation, please include a "photos" array with 1-2 valid, high-quality image URLs that are highly relevant to the specific day's context and activities.
12. RICH MEDIA: Ensure all image links provided are functional and accurately represent the destination or event. The system will also automatically supplement these with official Wikipedia imagery where available. Try to provide specific location names for better matching.`
}

export function exportTripToJson(trip: Trip): string {
  const exportData = {
    title: trip.title,
    description: trip.description,
    startDate: trip.startDate,
    endDate: trip.endDate,
    emoji: trip.emoji,
    places: trip.places.map(p => ({
      name: p.name,
      location: p.location,
      country: p.country,
      lat: p.lat,
      lng: p.lng,
      day: p.day,
      endDay: p.endDay,
      arrival: p.arrival,
      departure: p.departure,
      emoji: p.emoji,
      notes: p.notes.map(n => n.text),
      events: p.events.map(e => ({
        title: e.title,
        description: e.description,
        time: e.time,
        endTime: e.endTime,
        type: e.type,
        location: e.location,
        emoji: e.emoji,
        photos: e.photos
      })),
      accommodations: p.accommodations.map(a => ({
        name: a.name,
        type: a.type,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
        address: a.address,
        description: a.description,
        photos: a.photos
      })),
      transport: p.transport?.map(t => ({
        title: t.title,
        type: t.type,
        from: t.from,
        to: t.to,
        departure: t.departure,
        departureDay: t.departureDay,
        arrival: t.arrival,
        arrivalDay: t.arrivalDay,
        duration: t.duration,
        provider: t.provider,
        notes: t.notes?.map(n => n.text),
        links: t.links?.map(l => ({ title: l.title, url: l.url }))
      })),
      links: p.links.map(l => ({ title: l.title, url: l.url }))
    }))
  }
  return JSON.stringify(exportData, null, 2)
}

export async function parseItineraryJson(jsonStr: string): Promise<Partial<Trip> | null> {
  try {
    // Extract JSON if it's wrapped in markdown code blocks
    let cleaned = jsonStr.trim()
    if (cleaned.startsWith('```')) {
      const match = cleaned.match(/```(?:json)?\n?([\s\S]+?)\n?```/)
      if (match) cleaned = match[1]
    }

    const data = JSON.parse(cleaned)
    // Basic validation and mapping
    if (!data.places || !Array.isArray(data.places)) return null
    
    const places = await Promise.all(data.places.map(async (p: any, idx: number) => {
      // Automatic Image Fetching for Places
      const photos = await fetchPlaceImages(p.name, p.photos || [])
      
      const events = await Promise.all((p.events || []).map(async (e: any, eIdx: number) => {
        const ePhotos = await fetchPlaceImages(e.title, e.photos || [])
        return {
          id: `e-${eIdx}`,
          title: e.title || 'Event',
          description: e.description || '',
          time: e.time || '12:00',
          endTime: e.endTime,
          type: e.type || 'activity',
          location: e.location,
          photos: ePhotos,
          documents: []
        }
      }))

      const accommodations = await Promise.all((p.accommodations || []).map(async (a: any, aIdx: number) => {
        const aPhotos = await fetchPlaceImages(a.name, a.photos || [])
        return {
          id: `a-${aIdx}`,
          name: a.name || 'Hotel',
          type: a.type || 'hotel',
          checkIn: a.checkIn || '15:00',
          checkOut: a.checkOut || '11:00',
          address: a.address || '',
          photos: aPhotos,
          documents: []
        }
      }))

      return {
        id: `imported-${Date.now()}-${idx}`,
        name: p.name || 'Unknown Place',
        location: p.location || '',
        country: p.country || '',
        lat: p.lat,
        lng: p.lng,
        day: p.day || 1,
        endDay: p.endDay || p.day || 1,
        departure: p.departure || '10:00',
        emoji: p.emoji || '📍',
        photos: photos,
        notes: Array.isArray(p.notes) ? p.notes.map((text: string, nIdx: number) => ({ id: `n-${nIdx}`, day: p.day || 1, text })) : [],
        accommodations: accommodations,
        events: events,
        transport: Array.isArray(p.transport) ? p.transport.map((t: any, tIdx: number) => ({
          id: `t-${tIdx}`,
          title: t.title,
          type: t.type || 'car',
          from: t.from || '',
          to: t.to || '',
          departure: t.departure || '00:00',
          departureDay: t.departureDay || p.day || 1,
          arrival: t.arrival || '00:00',
          arrivalDay: t.arrivalDay || t.departureDay || p.day || 1,
          documents: []
        })) : [],
        documents: [],
        links: Array.isArray(p.links) ? p.links.map((l: any, lIdx: number) => ({
          id: `l-${lIdx}`,
          title: l.title || l.url || 'Link',
          url: l.url || ''
        })) : []
      }
    }))

    return {
      title: data.title,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      emoji: data.emoji,
      places: places
    }
  } catch (e) {
    console.error('Failed to parse itinerary JSON', e)
    return null
  }
}
