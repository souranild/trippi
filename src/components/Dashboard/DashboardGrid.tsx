'use client'

import Link from 'next/link'
import { Trip } from '@/lib/storage'
import TripCard from './TripCard'

interface DashboardGridProps {
  trips: Trip[]
  onDelete: (id: string) => void
}

export default function DashboardGrid({ trips, onDelete }: DashboardGridProps) {
  if (trips.length === 0) {
    return null
  }

  // Sort trips: active (started but not ended) first, then upcoming, then past
  const now = new Date()
  const sortedTrips = [...trips].sort((a, b) => {
    const aStart = new Date(a.startDate)
    const aEnd = a.endDate ? new Date(a.endDate) : new Date(a.startDate)
    const bStart = new Date(b.startDate)
    const bEnd = b.endDate ? new Date(b.endDate) : new Date(b.startDate)

    // Active trips first
    const aIsActive = aStart <= now && now <= aEnd
    const bIsActive = bStart <= now && now <= bEnd

    if (aIsActive && !bIsActive) return -1
    if (!aIsActive && bIsActive) return 1

    // Then upcoming
    const aIsUpcoming = aStart > now
    const bIsUpcoming = bStart > now

    if (aIsUpcoming && !bIsUpcoming) return -1
    if (!aIsUpcoming && bIsUpcoming) return 1

    // Then by start date
    return aStart.getTime() - bStart.getTime()
  })

  // Find the current adventure (active trip)
  const currentTrip = sortedTrips.find(trip => {
    const start = new Date(trip.startDate)
    const end = trip.endDate ? new Date(trip.endDate) : new Date(start.getTime() + 10 * 24 * 60 * 60 * 1000)
    return start <= now && now <= end
  })

  const otherTrips = currentTrip ? sortedTrips.filter(trip => trip.id !== currentTrip.id) : sortedTrips
  const visibleOtherTrips = otherTrips.slice(0, 3)
  const hasMoreTrips = otherTrips.length > 3

  return (
    <div className="animate-fade-in">
      {/* Current Adventure section - only show if there's an active trip */}
      {currentTrip && (
        <div className="mb-6 sm:mb-8">
          <h3 className="text-label text-[#8ff5ff] font-bold mb-3 sm:mb-4">
            Current Adventure
          </h3>
          <div className="w-full">
            <TripCard trip={currentTrip} onDelete={onDelete} className="w-full" />
          </div>
        </div>
      )}

      {/* Plan a new adventure - only show if no current adventure */}
      {!currentTrip && sortedTrips.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <div className="text-center py-12 sm:py-16">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-primary">explore</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-headline font-bold text-white mb-2">
              Plan a New Adventure
            </h3>
            <p className="text-body text-neutral-400 mb-6 max-w-md mx-auto">
              Ready for your next journey? Create a new trip and start planning your perfect adventure.
            </p>
            <Link
              href="/trip/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined">add</span>
              <span>Create New Trip</span>
            </Link>
          </div>
        </div>
      )}

      {/* Other trips */}
      {visibleOtherTrips.length > 0 && (
        <div>
          <h3 className="text-label text-[#c3f400] font-bold mb-3 sm:mb-4">
            More Adventures
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {visibleOtherTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} onDelete={onDelete} />
            ))}
          </div>

          {/* View More Button */}
          {hasMoreTrips && (
            <div className="mt-6 sm:mt-8 flex justify-center">
              <Link
                href="/trips"
                className="px-6 sm:px-8 py-3 sm:py-4 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 group"
              >
                <span>See All</span>
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform duration-300">
                  arrow_forward
                </span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
