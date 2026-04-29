'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Trip } from '@/lib/storage'
import { formatDuration } from '@/lib/date-utils'
import { ConfirmationModal } from '../ConfirmationModal'

interface TripCardProps {
  trip: Trip
  onDelete?: (id: string) => void
  className?: string
  isCurrent?: boolean
}

export default function TripCard({ trip, onDelete, className = '', isCurrent = false }: TripCardProps) {
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const formattedDuration = formatDuration(trip.startDate, trip.endDate)

  // Prefetch the trip page to make navigation feel instant
  useEffect(() => {
    router.prefetch(`/trip/${trip.id}`)
  }, [trip.id, router])

  // Auto-update time for live indicators
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000)
    return () => clearInterval(timer)
  }, [])

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }

  return (
    <div
      onClick={() => router.push(`/trip/${trip.id}`)}
      className={`group relative overflow-hidden rounded-xl sm:rounded-2xl transition-all duration-500 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-[#8ff5ff] focus:ring-offset-2 focus:ring-offset-[#0e0e0e] active:scale-95 cursor-pointer ring-2 ring-primary/50 shadow-[0_0_20px_rgba(195,244,0,0.3)] ${className}`}
    >
      {/* Glass background with gradient - only for current adventure */}
      {isCurrent && <div className="glass absolute inset-0 z-0" />}
      
      {/* Wallpaper background */}
      {trip.wallpaper && (
        <>
          <div
            className="absolute inset-0 opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700 pointer-events-none rounded-xl sm:rounded-2xl"
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

        {/* Live Activity indicator if current */}
        {isCurrent && trip.places && trip.places.length > 0 && (() => {
          const startParts = trip.startDate.split('-').map(Number);
          const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
          const today = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
          
          const diffTime = today.getTime() - start.getTime();
          const day = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
          
          const currentDayPlaces = trip.places.filter(p => {
            const placeStart = p.day || 1;
            const placeEnd = p.endDay || placeStart;
            return day >= placeStart && day <= placeEnd;
          });
          
          const timeToMins = (t: string | undefined) => {
            if (!t) return null;
            const clean = t.replace(/\s*(AM|PM)/i, '').trim();
            let [h, m] = clean.split(':').map(Number);
            const isPM = t.toLowerCase().includes('pm');
            const isAM = t.toLowerCase().includes('am');
            if (isPM && h < 12) h += 12;
            else if (isAM && h === 12) h = 0;
            return h * 60 + (isNaN(m) ? 0 : m);
          };

          const nowTimeMins = currentTime.getHours() * 60 + currentTime.getMinutes();
          
          let activeByTime: any = null;
          let upcomingToday: any = null;

          for (const p of currentDayPlaces) {
            const arrMins = timeToMins(p.arrival);
            const depMins = timeToMins(p.departure);

            if (arrMins !== null && depMins !== null) {
              if (nowTimeMins >= arrMins && nowTimeMins <= depMins) {
                activeByTime = p;
                break;
              }
              if (arrMins > nowTimeMins && !upcomingToday) {
                upcomingToday = p;
              }
            } else if (arrMins === null && !upcomingToday) {
              // Place without time might be an "all day" base or similar
              // But we prefer timed ones for specific "next"
            }
          }

          // Fallbacks
          if (!activeByTime && !upcomingToday && currentDayPlaces.length > 0) {
            // Find if anything was earlier today
            const lastOne = currentDayPlaces[currentDayPlaces.length - 1];
            const lastEndMins = timeToMins(lastOne.departure);
            if (lastEndMins !== null && nowTimeMins > lastEndMins) {
              // Everything today is finished, maybe show first thing tomorrow or nothing?
            } else {
              upcomingToday = currentDayPlaces[0];
            }
          }

          const currentPlace = activeByTime || upcomingToday || trip.places.find(p => (p.day || 1) > day) || trip.places[0];
          const isActuallyToday = currentDayPlaces.some(p => p.id === currentPlace.id);
          const isLive = activeByTime !== null;
          
          const activeTransport = currentPlace?.transport?.find(t => {
             const tDay = t.day || currentPlace.day || 1;
             return tDay === day;
          });

          const nextPlace = trip.places.find(p => p.id !== currentPlace?.id && (p.day || 1) >= (currentPlace?.day || 1));
          const statusText = isLive ? 'LIVE' : isActuallyToday ? 'UP NEXT TODAY' : 'UPCOMING';

          return (
            <div className="mt-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-700">
              {/* CURRENT THING - Rich Card */}
              <div 
                className={`relative overflow-hidden rounded-2xl border backdrop-blur-2xl transition-all duration-500 cursor-pointer ${isLive || statusText === 'LIVE' ? 'bg-primary/25 border-primary/50 shadow-xl shadow-primary/10 ring-1 ring-primary/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/trip/${trip.id}?scrollTo=day-${day}-place-${currentPlace.id}`);
                }}
              >
                {(isLive || statusText === 'LIVE') && (
                  <div className="absolute top-0 right-0 p-2.5 z-10">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary rounded-full shadow-[0_0_15px_rgba(143,244,255,0.4)]">
                      <div className="w-1.5 h-1.5 bg-slate-950 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-bold text-slate-950 leading-none">Live</span>
                    </div>
                  </div>
                )}
                
                <div className="p-4 flex gap-4">
                  <div className={`w-14 h-14 shrink-0 flex items-center justify-center rounded-2xl text-2xl shadow-inner border border-white/20 ${isLive || statusText === 'LIVE' ? 'bg-primary text-slate-950' : 'bg-white/10 text-white opacity-40'}`}>
                    <span className="material-symbols-outlined text-3xl">location_on</span>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className={`text-xs font-bold ${isLive || statusText === 'LIVE' ? 'text-primary' : 'text-white/60'}`}>
                        {statusText}
                      </div>
                      {(currentPlace.arrival || currentPlace.departure) && (
                        <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-white/10 rounded-md border border-white/10">
                          <span className="material-symbols-outlined text-[10px] text-white/50">schedule</span>
                          <span className="text-[10px] font-bold text-white/80">
                            {currentPlace.arrival || '??'} - {currentPlace.departure || '??'}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-lg font-black text-white truncate leading-none mb-1">{currentPlace.name}</p>
                    <p className="text-xs text-white/70 truncate opacity-90 italic">{currentPlace.location}</p>
                                      {/* Expanded Metadata - Filtered by Day */}
                    <div className="space-y-2 mt-3 pt-3 border-t border-white/5">
                      {(() => {
                        const noteText = Array.isArray(currentPlace.notes) 
                          ? currentPlace.notes.find(n => n.day === day)?.text 
                          : (typeof currentPlace.notes === 'string' && currentPlace.notes && (day === (currentPlace.day || 1) || (currentPlace as any).copyNotesAcrossDays) ? currentPlace.notes : null)
                        return noteText && (
                          <p className="text-[10px] text-white/60 line-clamp-2 italic leading-relaxed pl-2 border-l-2 border-white/20">
                            {noteText}
                          </p>
                        )
                      })()}
                      
                      {/* Accommodations */}
                      {currentPlace.accommodations?.filter(acc => {
                        const start = acc.checkInDay || currentPlace.day || 1;
                        const end = acc.checkOutDay || currentPlace.endDay || currentPlace.day || 1;
                        return day >= start && day <= end;
                      }).map((acc, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-1.5 px-2">
                          <span className="material-symbols-outlined text-[14px] text-yellow-400 shrink-0">bed</span>
                          <p className="text-[10px] text-yellow-100/90 font-bold truncate">{acc.name}</p>
                        </div>
                      ))}

                      {/* Events */}
                      {currentPlace.events?.filter(event => {
                        const start = event.day || currentPlace.day || 1;
                        const end = event.endDay || start;
                        return day >= start && day <= end;
                      }).map((event, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-red-400/10 border border-red-400/20 rounded-lg p-1.5 px-2">
                          <span className="material-symbols-outlined text-[14px] text-red-400 shrink-0">flag</span>
                          <p className="text-[10px] text-red-100/90 font-bold truncate">{event.title}</p>
                        </div>
                      ))}

                      {currentPlace.links && currentPlace.links.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          {currentPlace.links.filter(link => {
                            const lDay = link.day || currentPlace.day || 1;
                            const lEndDay = link.endDay || lDay;
                            return day >= lDay && day <= lEndDay;
                          }).slice(0, 2).map((link, idx) => (
                            <div key={idx} className="flex items-center gap-2 px-1">
                              <span className="material-symbols-outlined text-[14px] text-cyan-400/60 shrink-0">link</span>
                              <p className="text-[10px] text-cyan-100/60 truncate">{link.title || link.url}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {currentPlace.documents && currentPlace.documents.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          {currentPlace.documents.filter(doc => {
                             const dDay = doc.day || currentPlace.day || 1;
                             const dEndDay = doc.endDay || dDay;
                             return day >= dDay && day <= dEndDay;
                          }).slice(0, 2).map((doc, idx) => (
                            <div key={idx} className="flex items-center gap-2 px-1">
                              <span className="material-symbols-outlined text-[14px] text-blue-400/60 shrink-0">description</span>
                              <p className="text-[10px] text-blue-100/60 truncate">{doc.title || doc.file?.name}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeTransport && (
                        <div 
                          className="flex items-center gap-2 bg-primary/10 rounded-lg p-2 border border-primary/20 animate-in zoom-in duration-500 hover:bg-primary/20 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/trip/${trip.id}?scrollTo=transport-${activeTransport.id}`);
                          }}
                        >
                           <span className="material-symbols-outlined text-[16px] text-primary animate-bounce">flight</span>
                           <div className="flex-1 min-w-0">
                             <p className="text-[10px] font-bold text-primary">Current Travel</p>
                             <div className="flex items-center justify-between gap-2">
                               <p className="text-[10px] text-white font-bold truncate">{activeTransport.type} to {currentPlace.name}</p>
                               {(activeTransport.departure || activeTransport.arrival) && (
                                 <span className="text-[9px] font-black text-primary/80 shrink-0 whitespace-nowrap">
                                   {activeTransport.departure || '??'} → {activeTransport.arrival || '??'}
                                 </span>
                               )}
                             </div>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* NEXT THING - Compact & Minimalist */}
              {nextPlace && nextPlace.id !== currentPlace.id && (
                <div 
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl p-2 px-3 border border-white/5 group/next transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nDay = nextPlace.day || day;
                    router.push(`/trip/${trip.id}?scrollTo=day-${nDay}-place-${nextPlace.id}`);
                  }}
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-base">location_on</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-white/50 font-bold">Later today</span>
                      <span className="material-symbols-outlined text-[10px] text-white/40 group-hover/next:translate-x-1 transition-transform">arrow_forward</span>
                    </div>
                    <p className="text-xs text-white/80 font-bold truncate">{nextPlace.name}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Trip metadata */}
        <div className="mt-auto pt-3 sm:pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-1 text-[#b0b0b0]">
                <span className="material-symbols-outlined text-base">
                  calendar_month
                </span>
                <span>{formattedDuration}</span>
              </div>
              <div className="flex items-center gap-1 text-[#b0b0b0]">
                <span className="material-symbols-outlined text-base">
                  location_on
                </span>
                <span>{trip.places?.length || 0} stops</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform duration-300">
              arrow_outward
            </span>
          </div>
        </div>
      </div>

      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl glow-blue" />
    
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Trip?"
        message={`Are you sure you want to delete "${trip.title}"? This action cannot be undone.`}
        onConfirm={() => onDelete?.(trip.id)}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
