'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Trip } from '@/lib/storage'
import { formatDuration, formatTime } from '@/lib/date-utils'
import { LiveStatus, LiveStatusItem } from '@/lib/live-status'

interface HeroTripCardProps {
  trip: Trip
  liveStatus?: LiveStatus | null
  className?: string
}

export default function HeroTripCard({ trip, liveStatus, className = '' }: HeroTripCardProps) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)
  
  const totalStops = trip.places?.length || 0
  const uniqueCountries = new Set(trip.places?.map(p => p.country).filter(Boolean)).size
  const formattedDuration = formatDuration(trip.startDate, trip.endDate)

  return (
    <div
      onClick={() => router.push(`/trip?id=${trip.id}`)}
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

        {/* Live Track / Upcoming */}
        {liveStatus && liveStatus.timeline.length > 0 && (
          <div className="shrink-0 w-full md:w-[340px] bg-white/[0.03] backdrop-blur-md rounded-[2rem] border border-white/5 p-6 space-y-5 flex flex-col group/live animate-in slide-in-from-right-10 duration-1000">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <span className="material-symbols-outlined text-primary text-xl animate-pulse">radar</span>
                  <div className="absolute inset-0 bg-primary/20 blur-lg animate-pulse" />
                </div>
                <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Live Track</span>
              </div>
              <div className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                <span className="text-[9px] font-black text-primary uppercase">Day {liveStatus.currentDay}</span>
              </div>
            </div>

            <div className="space-y-2 flex-1 overflow-visible">
              {liveStatus.timeline.map((item, idx) => (
                <div 
                  key={`${item.type}-${idx}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    const baseUrl = `/trip?id=${trip.id}`
                    let targetUrl = baseUrl
                    if (item.type === 'place') targetUrl += `?openPlace=${item.data.id}`
                    else if (item.type === 'event') targetUrl += `?openPlace=${item.data.placeId || item.data.id}&openEvent=${item.data.id}`
                    else if (item.type === 'accommodation') targetUrl += `?openPlace=${item.data.placeId || item.data.id}&openAccommodation=${item.data.id}`
                    else if (item.type === 'transport') targetUrl += `?openTransport=${item.data.id}`
                    router.push(targetUrl)
                  }}
                  className={`flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer border ${
                    item.status === 'now' 
                      ? 'bg-primary/10 border-primary/20 shadow-lg shadow-primary/5' 
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover/live:scale-110 ${
                    item.status === 'now' ? 'bg-primary text-black' : 'bg-white/10 text-white/60'
                  }`}>
                    <span className="material-symbols-outlined text-lg">
                      {item.type === 'place' ? 'location_on' : 
                       item.type === 'transport' ? 'commute' : 
                       item.type === 'event' ? 'flag' : 'bed'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-black truncate leading-none ${item.status === 'now' ? 'text-white' : 'text-white/60'}`}>
                        {item.type === 'place' ? item.data.name : 
                         item.type === 'event' ? item.data.title : 
                         item.type === 'accommodation' ? item.data.name : 
                         item.type === 'transport' ? (item.data.title || `${item.data.fromLocation || 'Start'} → ${item.data.toLocation || 'End'}`) : 
                         item.data.type || 'Travel'}
                      </p>
                      {item.status === 'now' && (
                        <div className="flex gap-0.5">
                          {[1,2,3].map(i => <div key={i} className={`w-1 h-1 bg-primary rounded-full animate-pulse`} style={{ animationDelay: `${i * 0.2}s` }} />)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="material-symbols-outlined text-[10px] text-white/20">schedule</span>
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-wider">
                        {formatTime(item.startTime, '12h')} {item.endTime ? `→ ${formatTime(item.endTime, '12h')}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="shrink-0 flex items-center md:pb-4 ml-auto">
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
