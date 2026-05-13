import { Trip, Place, Transport } from './storage'
import { getGlobalItinerary, ItineraryItem } from './itinerary-utils'

export interface LiveStatusItem {
  type: 'place' | 'transport' | 'event' | 'accommodation'
  data: any
  startTime: string
  endTime?: string
  day: number
  status: 'now' | 'upcoming'
}

export interface LiveStatus {
  activePlace: Place | null
  activeTransport: Transport | null
  currentDay: number
  currentTime: string
  timeline: LiveStatusItem[]
}

export function getLiveStatus(trip: Trip): LiveStatus {
  if (!trip || !trip.places?.length) {
    return { activePlace: null, activeTransport: null, currentDay: 0, currentTime: '', timeline: [] }
  }

  const now = new Date()
  const tripStart = new Date(trip.startDate)
  tripStart.setHours(0, 0, 0, 0)

  const diffTime = now.getTime() - tripStart.getTime()
  const currentDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')

  const itinerary = getGlobalItinerary(trip)
  
  let activePlace: Place | null = null
  let activeTransport: Transport | null = null
  const timeline: LiveStatusItem[] = []

  itinerary.forEach((item) => {
    if (item.type === 'place') {
      const startDay = item.data.day ?? 1
      const endDay = item.data.endDay || startDay
      const arrival = item.data.arrival || '00:00'
      const departure = item.data.departure || '23:59'

      const isNow = (currentDay > startDay && currentDay < endDay) ||
                    (currentDay === startDay && currentDay === endDay && currentTime >= arrival && currentTime <= departure) ||
                    (currentDay === startDay && currentDay < endDay && currentTime >= arrival) ||
                    (currentDay === endDay && currentDay > startDay && currentTime <= departure)

      if (isNow) {
        activePlace = item.data
        timeline.push({ type: 'place', data: item.data, startTime: arrival, endTime: departure, day: startDay, status: 'now' })
        
        // Add events and accommodations for this place if they are today or upcoming
        item.data.accommodations?.forEach((acc: any) => {
          const accStart = acc.checkInDay || startDay
          const accEnd = acc.checkOutDay || accStart
          const isAccNow = (currentDay >= accStart && currentDay <= accEnd)
          const isAccUpcoming = (accStart > currentDay) || (accStart === currentDay && acc.checkIn > currentTime)
          
          if (isAccNow || isAccUpcoming) {
             timeline.push({ 
               type: 'accommodation', 
               data: { ...acc, placeId: item.data.id }, 
               startTime: acc.checkIn, 
               endTime: acc.checkOut, 
               day: accStart, 
               status: isAccNow ? 'now' : 'upcoming' 
             })
          }
        })

        item.data.events?.forEach((ev: any) => {
          const evDay = ev.day || startDay
          const isEvNow = (evDay === currentDay && currentTime >= (ev.time || '00:00') && currentTime <= (ev.endTime || '23:59'))
          const isEvUpcoming = (evDay > currentDay) || (evDay === currentDay && (ev.time || '00:00') > currentTime)

          if (isEvNow || isEvUpcoming) {
            timeline.push({ 
              type: 'event', 
              data: { ...ev, placeId: item.data.id }, 
              startTime: ev.time || '00:00', 
              endTime: ev.endTime, 
              day: evDay, 
              status: isEvNow ? 'now' : 'upcoming' 
            })
          }
        })
      } else if ((startDay > currentDay) || (startDay === currentDay && arrival > currentTime)) {
        timeline.push({ type: 'place', data: item.data, startTime: arrival, endTime: departure, day: startDay, status: 'upcoming' })
      }
    } else if (item.type === 'transport') {
      const depDay = item.data.departureDay ?? 1
      const arrDay = item.data.arrivalDay ?? depDay
      const depTime = item.data.departure || '00:00'
      const arrTime = item.data.arrival || '23:59'

      const isNow = (currentDay > depDay && currentDay < arrDay) ||
                    (currentDay === depDay && currentDay === arrDay && currentTime >= depTime && currentTime <= arrTime) ||
                    (currentDay === depDay && currentDay < arrDay && currentTime >= depTime) ||
                    (currentDay === arrDay && currentDay > depDay && currentTime <= arrTime)

      if (isNow) {
        activeTransport = item.data
        timeline.push({ type: 'transport', data: item.data, startTime: depTime, endTime: arrTime, day: depDay, status: 'now' })
      } else if ((depDay > currentDay) || (depDay === currentDay && depTime > currentTime)) {
        timeline.push({ type: 'transport', data: item.data, startTime: depTime, endTime: arrTime, day: depDay, status: 'upcoming' })
      }
    }
  })

  // Sort timeline by day then start time
  timeline.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day
    return a.startTime.localeCompare(b.startTime)
  })

  return { activePlace, activeTransport, currentDay, currentTime, timeline: timeline.slice(0, 5) } // Limit to top 5
}
