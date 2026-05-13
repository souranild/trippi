'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useTrips } from '@/context/TripContext'
import type { Trip } from '@/lib/storage'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import DashboardGrid from '@/components/Dashboard/DashboardGrid'
import EmptyState from '@/components/Dashboard/EmptyState'
import TripCard from '@/components/Dashboard/TripCard'
import HeroTripCard from '@/components/Dashboard/HeroTripCard'
import ExploreSection from '@/components/ExploreSection'
import AppHeader from '@/components/AppHeader'

import MapSlot from '@/components/Map/MapSlot'
import { useMapContext } from '@/context/MapContext'
import { getLiveStatus } from '@/lib/live-status'


function GlobalFootprintSection({ trips, places, isMobileMapOpen }: { trips: Trip[], places: any[], isMobileMapOpen?: boolean }) {
  const { isExpanded, setIsExpanded } = useMapContext()
  const uniqueCountries = new Set(places.map(p => p.country).filter(Boolean)).size
  const totalPlaces = places.length

  return (
    <section className="w-full flex flex-col space-y-4">
      {/* Map - Much Taller and Search Enabled */}
      <div className="relative overflow-hidden rounded-[2rem] w-full aspect-[4/5] md:aspect-[3/4] lg:aspect-[16/22] bg-surface-container-lowest border border-white/5 shadow-2xl">
        {/* Interactive Leaflet Map Layer */}
        <div className="absolute inset-0 z-10 cursor-move">
          <MapSlot 
            isGlobal={true} 
            places={places} 
            showDayNumbers={false} 
            onMapClick={() => setIsExpanded(true)}
            className="absolute inset-0 w-full h-full bg-neutral-900" 
            isActiveOverride={!isExpanded && !isMobileMapOpen}
          />
        </div>
      </div>

      {/* Stats Below Map */}
      <div className="flex flex-col gap-3">
        <div className="glass-card rounded-xl border border-white/10 p-4 relative z-10">
          <div className="flex items-center justify-between">
            <p className="text-caption text-on-surface-variant font-bold">Countries</p>
            <p className="text-heading-3 font-headline font-bold text-white">{uniqueCountries}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl border border-white/10 p-4 relative z-10">
          <div className="flex items-center justify-between">
            <p className="text-caption text-secondary font-bold">Places</p>
            <p className="text-heading-3 font-headline font-bold text-white">{totalPlaces}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl border border-white/10 p-4 relative z-10">
          <div className="flex items-center justify-between">
            <p className="text-caption text-tertiary font-bold">Trips</p>
            <p className="text-heading-3 font-headline font-bold text-white">{trips.length}</p>
          </div>
        </div>
      </div>
    </section>
  )
}


function MoreTripsCard({ count, type, href }: { count: number, type: 'upcoming' | 'past', href: string }) {
  const icon = type === 'upcoming' ? 'flight_takeoff' : 'history'
  const colorClass = type === 'upcoming' ? 'text-secondary' : 'text-neutral-400'
  const subtitle = type === 'upcoming' ? 'Explore your future journeys' : 'Relive your travel history'

  return (
    <Link 
      href={href}
      className="group relative flex flex-col items-center justify-center p-8 rounded-[2rem] border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-primary/40 transition-all duration-500 text-center space-y-4 h-full min-h-[180px] sm:min-h-[220px] shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-xl group-hover:bg-primary/10 group-hover:border-primary/30">
        <span className={`material-symbols-outlined text-3xl transition-colors duration-500 ${colorClass} group-hover:text-primary`}>{icon}</span>
      </div>
      
      <div className="relative z-10">
        <h4 className="text-sm font-black text-white uppercase tracking-widest group-hover:text-primary transition-colors">+{count} {type === 'upcoming' ? 'Upcoming' : 'Past'}</h4>
        <p className="text-[10px] text-neutral-500 font-medium leading-relaxed mt-1 group-hover:text-neutral-400 transition-colors">
          {subtitle}
        </p>
      </div>
      
      <div className="relative z-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary group-hover:gap-3 transition-all pt-2 opacity-60 group-hover:opacity-100">
        <span>View Gallery</span>
        <span className="material-symbols-outlined text-xs">arrow_forward</span>
      </div>
    </Link>
  )
}


export default function Home() {
  const { trips, deleteTrip } = useTrips()
  const allPlacesWithEmojis = useMemo(() => trips.flatMap(t => 
    (t.places || []).map(p => ({ 
      ...p, 
      emoji: t.emoji || '📍', 
      tripId: t.id,
      tripTitle: t.title,
      tripDates: t.startDate + (t.endDate ? ` - ${t.endDate}` : '')
    }))
  ), [trips])
  
  const [now, setNow] = useState(new Date())
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false)
  const [isMobileMapClosing, setIsMobileMapClosing] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [leftPanelWidth, setLeftPanelWidth] = useState(66.6); // Percentage, default to ~2/3
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle mobile detection (below md breakpoint)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const closeMobileMap = () => {
    setIsMobileMapClosing(true)
    setTimeout(() => {
      setIsMobileMapOpen(false)
      setIsMobileMapClosing(false)
    }, 400)
  }

  // Auto-update now to keep categories fresh
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000)
    return () => clearInterval(timer)
  }, [])


  // Categorize trips
  const currentTrip = trips.find(trip => {
    const start = new Date(trip.startDate)
    let endDate = trip.endDate ? new Date(trip.endDate) : null
    
    if (!endDate && trip.places && trip.places.length > 0) {
      const lastPlace = trip.places[trip.places.length - 1]
      if (lastPlace.endDay !== undefined) {
        endDate = new Date(start.getTime() + (lastPlace.endDay - 1) * 24 * 60 * 60 * 1000)
      }
    }
    
    const end = endDate || new Date(start.getTime() + 10 * 24 * 60 * 60 * 1000)
    return start <= now && now <= end
  })

  const upcomingTrips = trips.filter(trip => {
    const start = new Date(trip.startDate)
    return start > now && trip.id !== currentTrip?.id
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

  const pastTrips = trips.filter(trip => {
    const end = trip.endDate ? new Date(trip.endDate) : new Date(trip.startDate)
    const isUpcoming = new Date(trip.startDate) > now
    return end < now && trip.id !== currentTrip?.id && !isUpcoming
  }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

  const visibleUpcoming = upcomingTrips.slice(0, 3)
  const visiblePast = pastTrips.slice(0, 3)
  const hasMoreUpcoming = upcomingTrips.length > 3
  const hasMorePast = pastTrips.length > 3

  const liveStatus = useMemo(() => {
    if (!currentTrip) return null
    return getLiveStatus(currentTrip)
  }, [currentTrip, now])

  return (
    <div className="min-h-screen text-white">
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

      <main className="w-full px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {trips.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">

            <div 
              ref={containerRef}
              className={`grid grid-cols-1 lg:grid-cols-[var(--left-width)_minmax(0,1fr)] min-w-0 gap-0 items-start relative transition-all duration-700 ${isResizing ? 'select-none cursor-col-resize' : ''}`}
              style={{ '--left-width': !isMobile ? `${leftPanelWidth}%` : '100%' } as React.CSSProperties}
            >
              {isResizing && (
                <div 
                  className="fixed inset-0 z-[1000] cursor-col-resize select-none"
                  onPointerMove={(e) => {
                    if (!containerRef.current) return;
                    const rect = containerRef.current.getBoundingClientRect();
                    const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
                    if (newWidth > 20 && newWidth < 80) {
                      setLeftPanelWidth(newWidth);
                      window.dispatchEvent(new Event('resize'));
                    }
                  }}
                  onPointerUp={() => setIsResizing(false)}
                />
              )}

              {/* Left Column: Adventures */}
              <div className="lg:pr-6 space-y-8 sm:space-y-12 min-w-0 overflow-hidden">
                {/* Current Adventure */}
                {currentTrip && (
                  <div className="animate-fade-in">
                    <div className="flex items-baseline justify-between mb-4">
                      <h2 className="text-label text-primary font-bold">
                        Current Adventure
                      </h2>
                      <span className="material-symbols-outlined text-base text-primary animate-pulse">
                        circle
                      </span>
                    </div>
                    <div className="flex flex-col space-y-4 overflow-visible">
                      <HeroTripCard trip={currentTrip} liveStatus={liveStatus} />
                      <div className="px-2 text-xs font-medium text-neutral-400 text-center">
                        {new Date(currentTrip.startDate).getFullYear()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Upcoming Adventures */}
                {upcomingTrips.length > 0 ? (
                  <div className="animate-fade-in">
                    <div className="flex items-baseline justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h2 className="text-label text-secondary font-bold">
                          Upcoming Adventures
                        </h2>
                        <span className="material-symbols-outlined text-base text-secondary">flight_takeoff</span>
                      </div>
                      <span className="text-caption text-neutral-500">{upcomingTrips.length} {upcomingTrips.length === 1 ? 'trip' : 'trips'}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 overflow-visible">
                      {upcomingTrips.slice(0, hasMoreUpcoming ? 2 : 3).map((trip) => (
                        <div key={trip.id} className="animate-fade-in flex flex-col">
                          <TripCard trip={trip} className="flex-1" />
                          <div className="mt-2 px-2 text-xs font-medium text-neutral-400 text-center">
                            {new Date(trip.startDate).getFullYear()}
                          </div>
                        </div>
                      ))}
                      {hasMoreUpcoming && (
                        <div className="animate-fade-in flex flex-col">
                          <MoreTripsCard 
                            count={upcomingTrips.length - 2} 
                            type="upcoming" 
                            href="/adventures?status=upcoming&sort=oldest" 
                          />
                          <div className="mt-2 h-4" /> {/* Spacer to match year text height */}
                        </div>
                      )}
                    </div>
                  </div>
                ) : trips.length < 3 && (
                  <div className="p-8 rounded-[2rem] border border-dashed border-white/10 flex flex-col items-center text-center space-y-3 opacity-50 hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-4xl text-neutral-600">add_location_alt</span>
                    <div>
                      <h4 className="text-sm font-bold text-white">Next Destination?</h4>
                      <p className="text-xs text-neutral-500">Plan your next adventure and see it countdown here.</p>
                    </div>
                    <Link href="/trip/new" className="text-[10px] font-black uppercase tracking-widest text-secondary hover:text-white transition-colors">
                      Plan Now
                    </Link>
                  </div>
                )}

                {/* Past Adventures */}
                {pastTrips.length > 0 ? (
                  <div className="animate-fade-in">
                    <div className="flex items-baseline justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h2 className="text-label text-neutral-400 font-bold">
                          Past Adventures
                        </h2>
                        <Link
                          href="/adventures?status=past&sort=newest"
                          className="p-1.5 text-neutral-500 hover:text-[#c3f400] hover:bg-white/5 rounded-lg transition-all duration-300"
                          title="View all adventures"
                        >
                          <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </Link>
                      </div>
                      <span className="text-caption text-neutral-500">{pastTrips.length} {pastTrips.length === 1 ? 'trip' : 'trips'}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 overflow-visible">
                      {pastTrips.slice(0, hasMorePast ? 2 : 3).map((trip) => (
                        <div key={trip.id} className="animate-fade-in flex flex-col">
                          <TripCard trip={trip} className="flex-1" />
                          <div className="mt-2 px-2 text-xs font-medium text-neutral-400 text-center">
                            {new Date(trip.startDate).getFullYear()}
                          </div>
                        </div>
                      ))}
                      {hasMorePast && (
                        <div className="animate-fade-in flex flex-col">
                          <MoreTripsCard 
                            count={pastTrips.length - 2} 
                            type="past" 
                            href="/adventures?status=past&sort=newest" 
                          />
                          <div className="mt-2 h-4" /> {/* Spacer to match year text height */}
                        </div>
                      )}
                      {!hasMorePast && pastTrips.length === 1 && (
                        <>
                          <div className="hidden sm:flex flex-col animate-fade-in h-full">
                            <div className="flex-1 p-8 rounded-[2rem] border border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-3 opacity-30">
                              <span className="material-symbols-outlined text-4xl text-neutral-600">history</span>
                              <div>
                                <h4 className="text-sm font-bold text-white">More Memories Await</h4>
                                <p className="text-xs text-neutral-500">Your future past adventures will appear here.</p>
                              </div>
                            </div>
                            <div className="mt-2 h-4" />
                          </div>
                          <div className="hidden xl:flex flex-col animate-fade-in h-full">
                            <div className="flex-1 p-8 rounded-[2rem] border border-dashed border-white/5 flex flex-col items-center justify-center text-center space-y-3 opacity-20">
                              <span className="material-symbols-outlined text-4xl text-neutral-700">travel_explore</span>
                            </div>
                            <div className="mt-2 h-4" />
                          </div>
                        </>
                      )}
                      {!hasMorePast && pastTrips.length === 2 && (
                        <div className="hidden xl:flex flex-col animate-fade-in h-full">
                          <div className="flex-1 p-8 rounded-[2rem] border border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-3 opacity-30">
                            <span className="material-symbols-outlined text-4xl text-neutral-600">history</span>
                            <div>
                              <h4 className="text-sm font-bold text-white">More Memories Await</h4>
                              <p className="text-xs text-neutral-500">Your future past adventures will appear here.</p>
                            </div>
                          </div>
                          <div className="mt-2 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                ) : trips.length < 3 && (
                  <div className="p-8 rounded-[2rem] border border-dashed border-white/10 flex flex-col items-center text-center space-y-3 opacity-50 hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-4xl text-neutral-600">history</span>
                    <div>
                      <h4 className="text-sm font-bold text-white">Your Travel Legacy</h4>
                      <p className="text-xs text-neutral-500">Completed trips will appear here to relive your memories.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Resize Handle */}
              {!isMobile && (
                <div 
                  className={`hidden lg:flex absolute top-0 bottom-0 z-50 cursor-col-resize group items-center justify-center w-8 -translate-x-1/2 hover:opacity-100 transition-opacity ${isResizing ? 'opacity-100' : 'opacity-0'}`}
                  style={{ left: `${leftPanelWidth}%` }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setIsResizing(true);
                  }}
                >
                  <div className={`w-0.5 h-full transition-colors ${isResizing ? 'bg-primary' : 'bg-primary/20 group-hover:bg-primary/50'} shadow-[0_0_15px_rgba(143,245,255,0.3)]`} />
                  <div className="absolute top-1/2 -translate-y-1/2 w-6 h-10 rounded-full bg-neutral-900 border border-white/10 flex flex-col items-center justify-center gap-0.5 shadow-xl">
                    <div className="w-0.5 h-3 bg-white/20 rounded-full" />
                    <div className="w-0.5 h-3 bg-white/20 rounded-full" />
                  </div>
                </div>
              )}

              {/* Right Column: Global Footprint (Map) */}
              <div className="hidden lg:block min-w-0 lg:pl-6">
                <div className="sticky top-28">
                  <GlobalFootprintSection trips={trips} places={allPlacesWithEmojis} isMobileMapOpen={isMobileMapOpen} />
                </div>
              </div>
            </div>
        </div>
        )}

        {/* Mobile Map Section - replaced with trigger for Drawer */}
        {trips.length > 0 && isMobile && (
          <div className="lg:hidden mt-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div 
              onClick={() => setIsMobileMapOpen(true)}
              className="glass-card rounded-[2rem] p-6 border border-white/10 relative overflow-hidden active:scale-[0.98] transition-all"
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-2xl">map</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Adventure Map</p>
                    <h3 className="text-xl font-bold text-white">Full Footprint</h3>
                  </div>
                </div>
                <span className="material-symbols-outlined text-neutral-500">arrow_forward_ios</span>
              </div>
              
              <div className="mt-6 grid grid-cols-3 gap-4 relative z-10 text-center">
                <div>
                  <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Places</p>
                  <p className="text-lg font-black text-white">{trips.flatMap(t => t.places || []).length}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Countries</p>
                  <p className="text-lg font-black text-white">{new Set(trips.flatMap(t => t.places || []).map(p => p.country).filter(Boolean)).size}</p>
                </div>
                <div>
                   <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Trips</p>
                   <p className="text-lg font-black text-white">{trips.length}</p>
                </div>
              </div>

              {/* Decorative background map trace */}
              <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 -rotate-12 translate-x-4 pointer-events-none">
                <span className="material-symbols-outlined text-[150px] text-primary">analytics</span>
              </div>
            </div>
          </div>
        )}

        {/* Floating Mobile Map Button */}
        {trips.length > 0 && isMobile && (
          <button
            onClick={() => setIsMobileMapOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-black rounded-full shadow-[0_8px_30px_rgba(195,244,0,0.4)] flex items-center justify-center z-[100] active:scale-95 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
          >
            <span className="material-symbols-outlined text-[28px] font-bold">map</span>
            <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping -z-10" />
          </button>
        )}

        {/* Mobile Map Panel (Drawer) copied from trip detail logic */}
        {isMobileMapOpen && (
          <div className="fixed inset-0 z-[2000] md:hidden flex justify-end">
            {/* Backdrop */}
            <div 
              className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-400 ${isMobileMapClosing ? 'opacity-0' : 'opacity-100'} animate-in fade-in duration-300`}
              onClick={closeMobileMap}
            />
            
            {/* Panel */}
            <div className={`relative w-[90%] sm:w-[500px] h-full bg-neutral-900 border-l border-white/10 shadow-2xl flex flex-col ${isMobileMapClosing ? 'animate-slide-out' : 'animate-slide-in'}`}>
              <div className="flex items-center justify-between p-4 border-b border-white/5 bg-neutral-950/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-sm">public</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Global Footprint</p>
                    <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-tighter">Your Travel Legacy</p>
                  </div>
                </div>
                
                <button 
                  onClick={closeMobileMap}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 text-white transition-all active:scale-95 border border-white/10"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <div className="flex-1 relative bg-neutral-950 overflow-hidden">
                <MapSlot 
                  isGlobal={true} 
                  places={allPlacesWithEmojis} 
                  showDayNumbers={false} 
                  className="w-full h-full" 
                  isActiveOverride={isMobileMapOpen}
                />
              </div>
              
              <div className="p-4 border-t border-white/5 bg-neutral-950/50">
                 <div className="flex justify-between items-center px-2">
                   <div className="flex flex-col">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Total Sights</p>
                      <p className="text-xl font-black text-primary">{trips.reduce((acc, t) => acc + (t.places?.length || 0), 0)}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Trips Mapped</p>
                      <p className="text-xl font-black text-white">{trips.length}</p>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* Explore Section - Show to everyone */}
        <ExploreSection />
      </main>
    </div>
  )
}
