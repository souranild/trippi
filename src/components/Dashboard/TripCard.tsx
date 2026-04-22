'use client'

import Link from 'next/link'
import { Trip } from '@/lib/storage'

interface TripCardProps {
  trip: Trip
  onDelete?: (id: string) => void
  className?: string
}

export default function TripCard({ trip, onDelete, className = '' }: TripCardProps) {
  const durationDays = trip.startDate
    ? Math.ceil(
        (new Date(trip.endDate || trip.startDate).getTime() -
          new Date(trip.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : 0

  const startDate = new Date(trip.startDate)
  const formattedDate = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm(`Delete "${trip.title}"?`)) {
      onDelete?.(trip.id)
    }
  }

  return (
    <Link
      href={`/trip/${trip.id}`}
      className={`group relative overflow-hidden rounded-xl sm:rounded-2xl transition-all duration-500 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-[#8ff5ff] focus:ring-offset-2 focus:ring-offset-[#0e0e0e] active:scale-95 ${className}`}
    >
      {/* Glass background with gradient */}
      <div className="glass absolute inset-0 z-0" />
      
      {/* Wallpaper background */}
      {trip.wallpaper && (
        <>
          <div
            className="absolute inset-0 opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700 pointer-events-none"
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
              // Could handle error here if needed
              console.warn('Failed to load wallpaper:', trip.wallpaper);
            }}
          />
        </>
      )}

      {/* Content */}
      <div className="relative z-10 p-4 sm:p-6 flex flex-col h-full min-h-40 sm:min-h-48">
        {/* Header with emoji and close button */}
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <span className="text-4xl sm:text-5xl group-hover:scale-110 transition-transform duration-300">
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
        <h3 className="text-lg sm:text-xl font-bold text-white mb-2 line-clamp-2 font-['Space Grotesk'] tracking-tight">
          {trip.title}
        </h3>

        {/* Trip metadata */}
        <div className="mt-auto pt-3 sm:pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-1 text-[#b0b0b0]">
                <span className="material-symbols-outlined text-base">
                  calendar_month
                </span>
                <span>{durationDays} days</span>
              </div>
              <div className="flex items-center gap-1 text-[#b0b0b0]">
                <span className="material-symbols-outlined text-base">
                  location_on
                </span>
                <span>{trip.places?.length || 0} stops</span>
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
