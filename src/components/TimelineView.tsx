import { Trip, Place } from '@/lib/storage'

interface TimelineViewProps {
  places: Place[]
  trip: Trip
  onAddEvent: (placeId: string) => void
}

export default function TimelineView({ places, trip, onAddEvent }: TimelineViewProps) {
  // Collect all events with their times and sort chronologically
  const allEvents: Array<{
    id: string
    type: 'place' | 'event' | 'transport'
    title: string
    time: string
    date: string
    day: number
    placeName?: string
    placeId?: string
    emoji?: string
  }> = []

  places.forEach((place) => {
    // Add place arrival
    if (place.arrival) {
      allEvents.push({
        id: `place-arrival-${place.id}`,
        type: 'place',
        title: `Arrive at ${place.name}`,
        time: place.arrival,
        date: place.day ? new Date(trip.startDate).toISOString().split('T')[0] : trip.startDate,
        day: place.day || 1,
        placeName: place.name,
        placeId: place.id,
        emoji: '📍'
      })
    }

    // Add events for this place
    if (place.events) {
      place.events.forEach((event, idx) => {
        if (event.time) {
          allEvents.push({
            id: `event-${place.id}-${idx}`,
            type: 'event',
            title: event.title,
            time: event.time,
            date: place.day ? new Date(trip.startDate).toISOString().split('T')[0] : trip.startDate,
            day: place.day || 1,
            placeName: place.name,
            placeId: place.id,
            emoji: event.emoji || '📅'
          })
        }
      })
    }

    // Add transport departures
    if (place.transport) {
      place.transport.forEach((transport, idx) => {
        if (transport.departure) {
          allEvents.push({
            id: `transport-${place.id}-${idx}`,
            type: 'transport',
            title: `Depart ${place.name} by ${transport.type}`,
            time: transport.departure,
            date: place.day ? new Date(trip.startDate).toISOString().split('T')[0] : trip.startDate,
            day: place.day || 1,
            placeName: place.name,
            placeId: place.id,
            emoji: '✈️'
          })
        }
      })
    }

    // Add place departure
    if (place.departure) {
      allEvents.push({
        id: `place-departure-${place.id}`,
        type: 'place',
        title: `Depart ${place.name}`,
        time: place.departure,
        date: place.day ? new Date(trip.startDate).toISOString().split('T')[0] : trip.startDate,
        day: place.day || 1,
        placeName: place.name,
        placeId: place.id,
        emoji: '👋'
      })
    }
  })

  // Sort events by date and time
  allEvents.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    return a.time.localeCompare(b.time)
  })

  if (allEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-6xl text-neutral-600 mb-4">schedule</span>
        <h3 className="text-xl font-bold text-white mb-2">No timed events yet</h3>
        <p className="text-neutral-400 mb-4">Add arrival/departure times or events to see your timeline</p>
        <button
          onClick={() => places.length > 0 && onAddEvent(places[0].id)}
          className="bg-primary text-black px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Add your first event
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {allEvents.map((event, idx) => {
        const isLast = idx === allEvents.length - 1
        const nextEvent = !isLast ? allEvents[idx + 1] : null
        const showConnector = nextEvent && event.date === nextEvent.date

        return (
          <div key={event.id} className="relative">
            {/* Timeline line */}
            {!isLast && showConnector && (
              <div className="absolute left-6 top-12 w-px h-16 bg-neutral-700"></div>
            )}

            <div className="flex items-start gap-4">
              {/* Time */}
              <div className="w-20 shrink-0 text-right">
                <div className="text-sm font-bold text-primary font-mono">{event.time}</div>
                <div className="text-xs text-neutral-500">Day {event.day}</div>
              </div>

              {/* Timeline dot */}
              <div className="w-3 h-3 bg-primary rounded-full mt-2 shrink-0 border-2 border-neutral-900"></div>

              {/* Event content */}
              <div className="flex-1 bg-neutral-900/20 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{event.emoji}</span>
                  <div className="flex-1">
                    <div className="text-white font-medium">{event.title}</div>
                    {event.placeName && (
                      <div className="text-neutral-400 text-sm">{event.placeName}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}