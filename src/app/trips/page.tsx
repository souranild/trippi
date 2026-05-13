'use client'

import { useTrips } from '@/context/TripContext'
import Link from 'next/link'
import type { Trip, Place } from '@/lib/storage'
import AppHeader from '@/components/AppHeader'
import { formatDuration } from '@/lib/date-utils'

function DetailedTripCard({ trip, onDelete }: { trip: Trip, onDelete?: (id: string) => void }) {
  const durationDays = trip.startDate
    ? Math.ceil(
        (new Date(trip.endDate || trip.startDate).getTime() -
          new Date(trip.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : 0

  const formattedDuration = formatDuration(trip.startDate, trip.endDate)

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm(`Delete "${trip.title}"?`)) {
      onDelete?.(trip.id)
    }
  }

  const startDate = trip.startDate ? new Date(trip.startDate) : null
  const endDate = trip.endDate ? new Date(trip.endDate) : null
  const now = new Date()
  const isUpcoming = startDate && startDate > now
  const isActive = startDate && startDate <= now && (!endDate || now <= endDate)
  const isPast = endDate && now > endDate

  return (
    <Link
      href={`/trip?id=${trip.id}`}
      className="group relative overflow-hidden rounded-xl sm:rounded-2xl transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-[#8ff5ff] focus:ring-offset-2 focus:ring-offset-[#0e0e0e] active:scale-95"
    >
      {/* Glass background with gradient */}
      <div className="glass absolute inset-0 z-0" />
      
      {/* Wallpaper background */}
      {trip.wallpaper && (
        <>
          <div
            className="absolute inset-0 opacity-30 group-hover:opacity-50 group-hover:scale-105 transition-all duration-700 pointer-events-none rounded-xl sm:rounded-2xl"
            style={{
              backgroundImage: `url(${trip.wallpaper})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          {/* Preload image to ensure it's cached */}
          <img
            src={trip.wallpaper}
            alt=""
            className="hidden"
            onError={() => {
              console.warn('Failed to load wallpaper:', trip.wallpaper);
            }}
          />
        </>
      )}

      {/* Status indicator */}
      <div className="absolute top-3 right-3 z-20">
        {isActive && (
          <div className="px-2 py-1 bg-green-500/20 border border-green-400/30 rounded-full">
            <span className="text-xs font-medium text-green-400">Active</span>
          </div>
        )}
        {isUpcoming && (
          <div className="px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full">
            <span className="text-xs font-medium text-blue-400">Upcoming</span>
          </div>
        )}
        {isPast && (
          <div className="px-2 py-1 bg-gray-500/20 border border-gray-400/30 rounded-full">
            <span className="text-xs font-medium text-gray-400">Completed</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 p-6 flex flex-col h-full min-h-64">
        {/* Header with emoji and close button */}
        <div className="flex items-start justify-between mb-4">
          <span className="text-5xl group-hover:scale-110 transition-transform duration-300">
            {trip.emoji || '🌍'}
          </span>
          {onDelete && (
            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2 hover:bg-white/10 rounded-lg touch-target"
              title="Delete trip"
            >
              <span className="material-symbols-outlined text-sm text-[#ff3333]">
                close
              </span>
            </button>
          )}
        </div>

        {/* Trip title */}
        <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 font-['Space Grotesk'] tracking-tight">
          {trip.title}
        </h3>

        {/* Trip dates */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-[#b0b0b0] mb-1">
            <span className="material-symbols-outlined text-base">calendar_month</span>
            <span>{formattedDuration}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#b0b0b0]">
            <span className="material-symbols-outlined text-base">schedule</span>
            <span>{durationDays} days</span>
          </div>
        </div>

        {/* Places preview */}
        {trip.places && trip.places.length > 0 && (
          <div className="mb-4 max-w-full">
            <p className="text-xs text-[#8ff5ff] uppercase tracking-widest font-bold mb-2">Destinations</p>
            <div className="flex flex-wrap gap-1">
              {trip.places.slice(0, 3).map((place: Place, index: number) => (
                <span key={index} className="px-2 py-1 bg-white/10 rounded-full text-xs text-white inline-block w-40 overflow-hidden line-clamp-2 text-justify">
                  {place.name}
                </span>
              ))}
              {trip.places.length > 3 && (
                <span className="px-2 py-1 bg-white/10 rounded-full text-xs text-[#b0b0b0]">
                  +{trip.places.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Trip metadata */}
        <div className="mt-auto pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-[#b0b0b0]">
                <span className="material-symbols-outlined text-base">location_on</span>
                <span>{trip.places?.length || 0} stops</span>
              </div>
              <div className="flex items-center gap-1 text-[#b0b0b0]">
                <span className="material-symbols-outlined text-base">photo</span>
                <span>{trip.photos?.length || 0} photos</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#8ff5ff] group-hover:translate-x-1 transition-transform duration-300">
              arrow_outward
            </span>
          </div>
        </div>
      </div>

      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl glow-blue" />
    </Link>
  )
}

function AdventuresGrid({ trips, onDelete }: { trips: Trip[], onDelete: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {trips.map((trip) => (
        <DetailedTripCard key={trip.id} trip={trip} onDelete={onDelete} />
      ))}
    </div>
  )
}


export default function TripsPage() {
  const { trips, deleteTrip } = useTrips()

  // Sort trips in reverse chronological order (newest first)
  const sortedTrips = [...trips].sort((a, b) => {
    const aDate = new Date(a.startDate)
    const bDate = new Date(b.startDate)
    return bDate.getTime() - aDate.getTime()
  })

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <AppHeader
        extraRight={
          <div className="flex items-center gap-2">
            <button className="p-2 text-neutral-400 hover:text-[#8ff5ff] hover:bg-white/5 rounded-lg transition-all duration-300 active:scale-95">
              <span className="material-symbols-outlined text-base">search</span>
            </button>
            <Link href="/trip/new" className="btn-primary text-xs flex items-center gap-1 group py-2 px-3">
              <span className="material-symbols-outlined text-base group-hover:rotate-12 transition-transform duration-300">add</span>
              <span className="hidden sm:inline">New Trip</span>
            </Link>
          </div>
        }
      />

      <main className="w-full px-4 sm:px-6 pt-20 pb-8 sm:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space Grotesk'] tracking-tight">
              Adventures
            </h1>
            <p className="text-[#b0b0b0] mt-2">
              Explore all your travel memories and plan future journeys
            </p>
          </div>

          {sortedTrips.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl sm:text-6xl mb-4">🗺️</div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 font-['Space Grotesk']">
                No adventures yet
              </h2>
              <p className="text-[#b0b0b0] mb-6">
                Start planning your first adventure!
              </p>
              <Link href="/trip/new" className="btn-primary">
                Create Your First Trip
              </Link>
            </div>
          ) : (
            <AdventuresGrid trips={sortedTrips} onDelete={deleteTrip} />
          )}
        </div>
      </main>
    </div>
  )
}