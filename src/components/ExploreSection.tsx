'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trip } from '@/lib/storage'
import { getRandomExampleTrips } from '@/lib/example-trips'

export default function ExploreSection() {
  const [exampleTrips, setExampleTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get 2 random example trips
    const trips = getRandomExampleTrips(2)
    setExampleTrips(trips)
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return null
  }

  return (
    <section className="w-full px-0 py-0">
      <div className="mb-6 sm:mb-8">
        <span className="text-label text-primary font-bold">Get Inspired</span>
        <h2 className="text-heading-2 kinetic-title mt-1 text-white">Explore</h2>
        <p className="text-body-sm text-neutral-400 mt-2">Discover example trips from around the world. Click any to start planning your own adventure.</p>
      </div>

      {/* Example Trips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {exampleTrips.map((trip) => {
          const totalPlaces = trip.places?.length || 0
          const uniqueCountries = new Set(trip.places?.map(p => p.country) || []).size
          const daysCount = trip.endDate ? Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)) : 1

          return (
            <div
              key={trip.id}
              className="group glass-card rounded-xl lg:rounded-2xl border border-white/10 p-5 sm:p-6 hover:border-primary/50 transition-all duration-300 cursor-pointer"
            >
              {/* Header with emoji and actions */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="text-4xl">{trip.emoji}</div>
                  <div className="flex-1">
                    <h3 className="text-heading-4 font-headline font-bold text-white group-hover:text-primary transition-colors duration-300">
                      {trip.title}
                    </h3>
                    <p className="text-body-sm text-neutral-400 mt-1">{trip.description}</p>
                  </div>
                </div>
              </div>

              {/* Trip Stats */}
              <div className="flex gap-4 sm:gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-primary">calendar_month</span>
                  <span className="text-body-sm text-neutral-300">{daysCount} days</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-primary">location_on</span>
                  <span className="text-body-sm text-neutral-300">{totalPlaces} places</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-primary">public</span>
                  <span className="text-body-sm text-neutral-300">{uniqueCountries} countries</span>
                </div>
              </div>

              {/* Places preview */}
              <div className="mb-5 pb-5 border-t border-white/10">
                <p className="text-label text-neutral-400 font-bold mb-2">Featured Stops</p>
                <div className="flex flex-wrap gap-2">
                  {trip.places?.slice(0, 3).map((place) => (
                    <span
                      key={place.id}
                      className="text-caption px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300"
                    >
                      {place.name}
                    </span>
                  ))}
                  {totalPlaces > 3 && (
                    <span className="text-caption px-3 py-1 rounded-full bg-primary/10 border border-primary/50 text-primary font-medium">
                      +{totalPlaces - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Action button */}
              <Link href="/" className="inline-flex items-center justify-center w-full btn-primary text-sm group/btn">
                <span>View Example</span>
                <span className="material-symbols-outlined text-base ml-2 group-hover/btn:translate-x-0.5 transition-transform duration-300">
                  arrow_outward
                </span>
              </Link>
            </div>
          )
        })}
      </div>

      {/* Divider */}
      <div className="mt-12 sm:mt-16 border-t border-white/5" />
    </section>
  )
}
