'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTrips } from '@/context/TripContext'
import type { Trip } from '@/lib/storage'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import DashboardGrid from '@/components/Dashboard/DashboardGrid'
import EmptyState from '@/components/Dashboard/EmptyState'
import TripCard from '@/components/Dashboard/TripCard'
import ExploreSection from '@/components/ExploreSection'
import AppHeader from '@/components/AppHeader'

import MapSlot from '@/components/Map/MapSlot'


function GlobalFootprintSection({ trips, places }: { trips: Trip[], places: any[] }) {
  const uniqueCountries = new Set(places.map(p => p.country).filter(Boolean)).size
  const totalPlaces = places.length

  return (
    <section className="w-full flex flex-col space-y-4">
      {/* Map - Much Taller and Search Enabled */}
      <div className="relative overflow-hidden rounded-[2rem] w-full aspect-[4/5] sm:aspect-[16/22] bg-surface-container-lowest border border-white/5 shadow-2xl">
        {/* Interactive Leaflet Map Layer */}
        <div className="absolute inset-0 z-10 cursor-move">
          <MapSlot 
            isGlobal={true} 
            places={places} 
            showDayNumbers={false} 
            className="absolute inset-0 w-full h-full bg-neutral-900" 
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

  // Handle mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
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
    // If there's an endDate, use it. Otherwise, if there are places, use the endDay of the last place.
    // As a final fallback, default to 10 days for fresh trips.
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

  // A trip is upcoming if it starts in the future and isn't the current trip
  const upcomingTrips = trips.filter(trip => {
    const start = new Date(trip.startDate)
    return start > now && trip.id !== currentTrip?.id
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

  // A trip is past if it ended in the past, isn't current, and ISN'T already counted as upcoming
  // (Prevents duplication if endDate < startDate)
  const pastTrips = trips.filter(trip => {
    const end = trip.endDate ? new Date(trip.endDate) : new Date(trip.startDate)
    const isUpcoming = new Date(trip.startDate) > now
    return end < now && trip.id !== currentTrip?.id && !isUpcoming
  }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

  const visibleUpcoming = upcomingTrips.slice(0, 3)
  const visiblePast = pastTrips.slice(0, 3)
  const hasMoreUpcoming = upcomingTrips.length > 3
  const hasMorePast = pastTrips.length > 3

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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Left Column: Adventures (2/3 width on large screens) */}
            <div className="lg:col-span-2 space-y-8 sm:space-y-12">
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
                  <div className="grid grid-cols-1 gap-4 sm:gap-6 overflow-visible">
                    <div className="flex flex-col">
                      <TripCard trip={currentTrip} isCurrent={true} />
                      <div className="mt-2 px-2 text-xs font-medium text-neutral-400 text-center">
                        {new Date(currentTrip.startDate).getFullYear()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Upcoming Adventures */}
              {upcomingTrips.length > 0 && (
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 overflow-visible">
                    {upcomingTrips.slice(0, 3).map((trip) => (
                      <div key={trip.id} className="animate-fade-in flex flex-col">
                        <TripCard trip={trip} />
                        <div className="mt-2 px-2 text-xs font-medium text-neutral-400 text-center">
                          {new Date(trip.startDate).getFullYear()}
                        </div>
                      </div>
                    ))}
                  </div>
                  {upcomingTrips.length > 3 && (
                    <Link
                      href="/adventures"
                      className="mt-4 group px-4 py-2 text-sm font-medium text-secondary hover:text-[#c3f400] bg-white/5 hover:bg-white/10 rounded-lg border border-secondary/30 hover:border-secondary/60 transition-all duration-300 flex items-center justify-center gap-2 w-full"
                    >
                      <span>+{upcomingTrips.length - 3} more upcoming</span>
                      <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform duration-300">arrow_forward</span>
                    </Link>
                  )}
                </div>
              )}

              {/* Past Adventures */}
              {pastTrips.length > 0 && (
                <div className="animate-fade-in">
                  <div className="flex items-baseline justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-label text-neutral-400 font-bold">
                        Past Adventures
                      </h2>
                      <Link
                        href="/adventures"
                        className="p-1.5 text-neutral-500 hover:text-[#c3f400] hover:bg-white/5 rounded-lg transition-all duration-300"
                        title="View all adventures"
                      >
                        <span className="material-symbols-outlined text-base">arrow_forward</span>
                      </Link>
                    </div>
                    <span className="text-caption text-neutral-500">{pastTrips.length} {pastTrips.length === 1 ? 'trip' : 'trips'}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 overflow-visible">
                    {pastTrips.slice(0, 3).map((trip) => (
                      <div key={trip.id} className="animate-fade-in flex flex-col">
                        <TripCard trip={trip} />
                        <div className="mt-2 px-2 text-xs font-medium text-neutral-400 text-center">
                          {new Date(trip.startDate).getFullYear()}
                        </div>
                      </div>
                    ))}
                  </div>
                  {pastTrips.length > 3 && (
                    <Link
                      href="/adventures"
                      className="mt-4 group px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-300 flex items-center justify-center gap-2 w-full"
                    >
                      <span>+{pastTrips.length - 3} more past trips</span>
                      <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform duration-300">arrow_forward</span>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Global Footprint (1/3 width on large screens, hidden on mobile) */}
            {!isMobile && (
              <div className="hidden lg:block">
                <div className="sticky top-28">
                  <GlobalFootprintSection trips={trips} places={allPlacesWithEmojis} />
                </div>
              </div>
            )}
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
          <div className="fixed inset-0 z-[2000] lg:hidden flex justify-end">
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
