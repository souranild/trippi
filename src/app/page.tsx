'use client'

import { useTrips } from '@/context/TripContext'
import type { Trip } from '@/lib/storage'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import DashboardGrid from '@/components/Dashboard/DashboardGrid'
import EmptyState from '@/components/Dashboard/EmptyState'
import TripCard from '@/components/Dashboard/TripCard'

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 z-0 bg-neutral-900 border border-white/5 animate-pulse" />,
})

function DashboardHeader() {
  const { userProfile } = useTrips()
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-between bg-neutral-900/40 pl-20 pr-6 py-4 shadow-[inset_0_1px_0_rgba(143,245,255,0.1)] backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-xl sm:text-2xl font-bold text-[#8ff5ff] font-['Space Grotesk'] tracking-tight hover:text-[#c3f400] transition-colors duration-300"
        >
          trippi
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button className="p-2 text-[#b0b0b0] hover:text-[#8ff5ff] hover:bg-white/5 rounded-lg transition-all duration-300 active:scale-95">
          <span className="material-symbols-outlined text-base">search</span>
        </button>
        {userProfile && (
          <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
            <span className="text-sm font-medium text-white">{userProfile.name}</span>
          </div>
        )}
        <Link href="/trip/new" className="btn-primary text-xs sm:text-sm flex items-center gap-1 sm:gap-2 group py-2 px-3 sm:px-4">
          <span className="material-symbols-outlined text-base group-hover:rotate-12 transition-transform duration-300">
            add
          </span>
          <span className="hidden sm:inline">New Trip</span>
          <span className="inline sm:hidden">New</span>
        </Link>
      </div>
    </header>
  )
}

function GlobalFootprintSection({ trips }: { trips: Trip[] }) {
  const allPlacesWithEmojis = trips.flatMap(t => 
    (t.places || []).map(p => ({ 
      ...p, 
      emoji: t.emoji || '📍', 
      tripId: t.id,
      tripTitle: t.title,
      tripDates: t.startDate + (t.endDate ? ` - ${t.endDate}` : '')
    }))
  )
  const uniqueCountries = new Set(allPlacesWithEmojis.map(p => p.country).filter(Boolean)).size
  const totalPlaces = allPlacesWithEmojis.length

  return (
    <section className="w-full">
      <div className="flex items-end justify-between mb-6 sm:mb-8">
        <div>
          <span className="text-label text-primary font-bold">Lifetime Stats</span>
          <h2 className="text-heading-2 kinetic-title mt-1 text-white">
            Global Footprint
          </h2>
        </div>
        <div className="hidden md:flex gap-4">
          <div className="text-right">
            <p className="text-caption text-on-surface-variant uppercase tracking-widest font-bold">Countries</p>
            <p className="text-xl sm:text-2xl font-headline font-bold text-secondary">{uniqueCountries}</p>
          </div>
          <div className="w-px h-8 sm:h-10 bg-outline-variant/30"></div>
          <div className="text-right">
            <p className="text-caption text-on-surface-variant uppercase tracking-widest font-bold">Total Places</p>
            <p className="text-xl sm:text-2xl font-headline font-bold text-primary">{totalPlaces}</p>
          </div>
        </div>
      </div>

      <div className="relative w-full aspect-[21/9] rounded-[2.5rem] bg-surface-container-lowest border border-white/5 overflow-hidden group neotactile-card">
        {/* Interactive Interactive Leaflet Map Layer */}
        <div className="absolute inset-0 z-0 cursor-move">
          <Map places={allPlacesWithEmojis} showDayNumbers={false} className="absolute inset-0 w-full h-full bg-neutral-900" />
        </div>

        {/* Side Stats Panel Overlay */}
        <div className="absolute right-6 sm:right-8 top-1/2 -translate-y-1/2 z-20 w-48 sm:w-56 glass-card p-4 sm:p-6 rounded-2xl border border-white/10 hidden lg:block pointer-events-none">
          <div className="space-y-4 sm:space-y-6">
            <div>
              <p className="text-caption text-on-surface-variant font-bold mb-1">Total Countries</p>
              <p className="text-heading-3 font-headline font-bold text-white">{uniqueCountries}</p>
            </div>
            <div className="w-full h-px bg-white/5"></div>
            <div>
              <p className="text-caption text-secondary font-bold mb-1">Total Places</p>
              <p className="text-heading-3 font-headline font-bold text-white">{totalPlaces}</p>
            </div>
            <div className="w-full h-px bg-white/5"></div>
            <div>
              <p className="text-caption text-tertiary font-bold mb-1">Total Trips</p>
              <p className="text-heading-3 font-headline font-bold text-white">{trips.length}</p>
            </div>
          </div>
        </div>

        {/* Map Legend Bottom Right */}
        <div className="absolute bottom-4 sm:bottom-6 left-6 sm:left-8 z-20 flex gap-4 sm:gap-6 pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(195,244,0,0.5)]"></div>
            <span className="text-caption text-[#b0b0b0] backdrop-blur-md bg-black/40 px-2 py-0.5 rounded">All Trip Destinations</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const { trips, deleteTrip } = useTrips()

  // Categorize trips
  const now = new Date()
  const currentTrip = trips.find(trip => {
    const start = new Date(trip.startDate)
    const end = trip.endDate ? new Date(trip.endDate) : new Date(start.getTime() + 10 * 24 * 60 * 60 * 1000)
    return start <= now && now <= end
  })

  const upcomingTrips = trips.filter(trip => {
    const start = new Date(trip.startDate)
    return start > now && trip.id !== currentTrip?.id
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

  const pastTrips = trips.filter(trip => {
    const end = trip.endDate ? new Date(trip.endDate) : new Date(trip.startDate)
    return end < now && trip.id !== currentTrip?.id
  }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

  const visibleUpcoming = upcomingTrips.slice(0, 3)
  const visiblePast = pastTrips.slice(0, 3)
  const hasMoreUpcoming = upcomingTrips.length > 3
  const hasMorePast = pastTrips.length > 3

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <DashboardHeader />

      <main className="w-full px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {trips.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Left Column: Trips (2/3 width on large screens) */}
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
                  <div className="w-full">
                    <TripCard trip={currentTrip} onDelete={deleteTrip} />
                  </div>
                </div>
              )}

              {/* Plan New Adventure CTA */}
              {!currentTrip && trips.length > 0 && (
                <div className="text-center py-12 sm:py-16 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-primary/20">
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-2xl text-primary">explore</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-headline font-bold text-white mb-2">
                    Plan a New Adventure
                  </h3>
                  <p className="text-sm text-neutral-400 mb-6 max-w-md mx-auto">
                    Ready for your next journey? Create a new trip and start planning.
                  </p>
                  <Link
                    href="/trip/new"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-all duration-300 hover:scale-105 active:scale-95 text-sm"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                    <span>Create Trip</span>
                  </Link>
                </div>
              )}

              {/* Upcoming Trips */}
              {upcomingTrips.length > 0 && (
                <div className="animate-fade-in">
                  <div className="flex items-baseline justify-between mb-4">
                    <h2 className="text-label text-secondary font-bold">
                      Upcoming Trips
                    </h2>
                    <span className="text-caption text-neutral-500">{upcomingTrips.length} {upcomingTrips.length === 1 ? 'trip' : 'trips'}</span>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    {visibleUpcoming.map((trip) => (
                      <div key={trip.id} className="animate-fade-in">
                        <TripCard trip={trip} onDelete={deleteTrip} />
                      </div>
                    ))}
                  </div>

                  {/* Show More Button for Upcoming */}
                  {hasMoreUpcoming && (
                    <Link
                      href="/adventures?status=upcoming"
                      className="mt-4 group px-4 py-2 text-sm font-medium text-secondary hover:text-[#c3f400] bg-white/5 hover:bg-white/10 rounded-lg border border-secondary/30 hover:border-secondary/60 transition-all duration-300 flex items-center justify-center gap-2 w-full"
                    >
                      <span>Show more ({upcomingTrips.length - 3} more)</span>
                      <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform duration-300">
                        arrow_forward
                      </span>
                    </Link>
                  )}
                </div>
              )}

              {/* Past Trips */}
              {pastTrips.length > 0 && (
                <div className="animate-fade-in">
                  <div className="flex items-baseline justify-between mb-4">
                    <h2 className="text-label text-tertiary font-bold">
                      Past Adventures
                    </h2>
                    <span className="text-caption text-neutral-500">{pastTrips.length} {pastTrips.length === 1 ? 'trip' : 'trips'}</span>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    {visiblePast.map((trip) => (
                      <div key={trip.id} className="animate-fade-in">
                        <TripCard trip={trip} onDelete={deleteTrip} />
                      </div>
                    ))}
                  </div>

                  {/* Show More Button for Past */}
                  {hasMorePast && (
                    <Link
                      href="/adventures?status=past"
                      className="mt-4 group px-4 py-2 text-sm font-medium text-tertiary hover:text-neutral-300 bg-white/5 hover:bg-white/10 rounded-lg border border-neutral-600/30 hover:border-neutral-600/60 transition-all duration-300 flex items-center justify-center gap-2 w-full"
                    >
                      <span>Show more ({pastTrips.length - 3} more)</span>
                      <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform duration-300">
                        arrow_forward
                      </span>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Map (1/3 width on large screens, hidden on mobile) */}
            <div className="hidden lg:block">
              <div className="sticky top-28 space-y-6">
                <div>
                  <span className="text-label text-primary font-bold">Lifetime Stats</span>
                  <h2 className="text-heading-2 kinetic-title mt-1 text-white">
                    Global Footprint
                  </h2>
                </div>

                <div className="relative w-full aspect-square rounded-2xl bg-surface-container-lowest border border-white/5 overflow-hidden group neotactile-card">
                  {/* Interactive Leaflet Map Layer */}
                  <div className="absolute inset-0 z-0 cursor-move">
                    <Map 
                      places={trips.flatMap(t => 
                        (t.places || []).map(p => ({ 
                          ...p, 
                          emoji: t.emoji || '📍', 
                          tripId: t.id,
                          tripTitle: t.title,
                          tripDates: t.startDate + (t.endDate ? ` - ${t.endDate}` : '')
                        }))
                      )}
                      showDayNumbers={false} 
                      className="absolute inset-0 w-full h-full bg-neutral-900" 
                    />
                  </div>

                  {/* Map Legend */}
                  <div className="absolute bottom-4 left-4 z-20 flex gap-2 pointer-events-none">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(195,244,0,0.5)]"></div>
                    <span className="text-xs text-[#b0b0b0] backdrop-blur-md bg-black/40 px-2 py-0.5 rounded line-clamp-1">Destinations</span>
                  </div>
                </div>

                {/* Stats */}
                {trips.length > 0 && (
                  <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div>
                      <p className="text-caption text-on-surface-variant uppercase tracking-widest font-bold text-neutral-500">Countries Visited</p>
                      <p className="text-2xl font-headline font-bold text-secondary mt-1">
                        {new Set(trips.flatMap(t => 
                          (t.places || []).map(p => p.country).filter(Boolean)
                        )).size}
                      </p>
                    </div>
                    <div className="w-full h-px bg-white/5"></div>
                    <div>
                      <p className="text-caption text-on-surface-variant uppercase tracking-widest font-bold text-neutral-500">Total Destinations</p>
                      <p className="text-2xl font-headline font-bold text-primary mt-1">
                        {trips.reduce((sum, t) => sum + (t.places?.length || 0), 0)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Map Section - below trips on mobile */}
        {trips.length > 0 && (
          <div className="lg:hidden mt-12 sm:mt-16">
            <GlobalFootprintSection trips={trips} />
          </div>
        )}
      </main>
    </div>
  )
}
