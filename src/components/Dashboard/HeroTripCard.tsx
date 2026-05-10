'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Trip } from '@/lib/storage'
import { formatDuration } from '@/lib/date-utils'

interface HeroTripCardProps {
  trip: Trip
  className?: string
}

export default function HeroTripCard({ trip, className = '' }: HeroTripCardProps) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)
  
  const totalStops = trip.places?.length || 0
  const uniqueCountries = new Set(trip.places?.map(p => p.country).filter(Boolean)).size
  const formattedDuration = formatDuration(trip.startDate, trip.endDate)

  return (
    <div
      onClick={() => router.push(`/trip/${trip.id}`)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative overflow-hidden rounded-[2rem] bg-neutral-900 border border-white/10 transition-all duration-700 cursor-pointer shadow-2xl hover:border-primary/50 ${className}`}
    >
      {/* Background Wallpaper with Parallax Effect */}
      {trip.wallpaper && (
        <div className="absolute inset-0 z-0">
          <div
            className={`absolute inset-0 transition-transform duration-[2s] ease-out ${isHovered ? 'scale-110' : 'scale-100'}`}
            style={{
              backgroundImage: `url(${trip.wallpaper})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e] via-transparent to-transparent opacity-80" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 p-8 md:p-12 h-full flex flex-col md:flex-row gap-8 md:items-end">
        <div className="flex-1 space-y-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/20 border border-primary/30 rounded-full w-fit animate-pulse">
            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Active Adventure</span>
          </div>

          <div className="space-y-2">
            <span className="text-6xl md:text-7xl block mb-2 drop-shadow-2xl animate-bounce-slow">
              {trip.emoji || '🌍'}
            </span>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight max-w-2xl">
              {trip.title}
            </h2>
            {trip.tags && trip.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 mb-2">
                {trip.tags.map(tag => (
                  <span key={tag} className="text-[11px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {trip.description && (
              <p className="text-lg text-neutral-400 font-medium max-w-xl line-clamp-2">
                {trip.description}
              </p>
            )}
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap items-center gap-6 pt-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">calendar_month</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Duration</span>
                <span className="text-sm font-bold text-white">{formattedDuration}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">location_on</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Stops</span>
                <span className="text-sm font-bold text-white">{totalStops} destinations</span>
              </div>
            </div>
            {uniqueCountries > 0 && (
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary">public</span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Countries</span>
                  <span className="text-sm font-bold text-white">{uniqueCountries} mapped</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 flex items-center md:pb-4">
          <div className="w-16 h-16 rounded-full bg-primary text-black flex items-center justify-center shadow-[0_0_30px_rgba(143,245,255,0.4)] group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-3xl font-bold">arrow_forward</span>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 right-0 p-8 opacity-5 pointer-events-none">
         <span className="material-symbols-outlined text-[200px] text-white">explore</span>
      </div>

      <style jsx>{`
        .animate-bounce-slow {
          animation: bounce 3s infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}
