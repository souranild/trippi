'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useTrips } from '@/context/TripContext'
import type { Trip } from '@/lib/storage'
import TripCard from '@/components/Dashboard/TripCard'

type ViewType = 'list' | 'gallery'
type SortType = 'newest' | 'oldest' | 'alphabetical' | 'duration'

interface Filters {
  status: 'all' | 'active' | 'upcoming' | 'past'
  year?: number
  country?: string
}

function getTripStatus(trip: Trip): 'active' | 'upcoming' | 'past' {
  const now = new Date()
  const start = new Date(trip.startDate)
  const end = trip.endDate ? new Date(trip.endDate) : new Date(start.getTime() + 10 * 24 * 60 * 60 * 1000)
  
  if (start <= now && now <= end) return 'active'
  if (start > now) return 'upcoming'
  return 'past'
}

function getTripDuration(trip: Trip): number {
  const start = new Date(trip.startDate)
  const end = trip.endDate ? new Date(trip.endDate) : start
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

export default function AdventuresPage() {
  const { trips, deleteTrip } = useTrips()
  const [viewType, setViewType] = useState<ViewType>('gallery')
  const [sortType, setSortType] = useState<SortType>('newest')
  const [filters, setFilters] = useState<Filters>({ status: 'all' })
  const [showFilters, setShowFilters] = useState(true)

  // Get unique years and countries for filter options
  const uniqueYears = useMemo(() => {
    const years = new Set(trips.map(t => new Date(t.startDate).getFullYear()))
    return Array.from(years).sort((a, b) => b - a)
  }, [trips])

  const uniqueCountries = useMemo(() => {
    const countries = new Set<string>()
    trips.forEach(trip => {
      trip.places?.forEach(place => {
        if (place.country) countries.add(place.country)
      })
    })
    return Array.from(countries).sort()
  }, [trips])

  // Filter trips
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      // Status filter
      if (filters.status !== 'all') {
        const status = getTripStatus(trip)
        if (status !== filters.status) return false
      }

      // Year filter
      if (filters.year) {
        const tripYear = new Date(trip.startDate).getFullYear()
        if (tripYear !== filters.year) return false
      }

      // Country filter
      if (filters.country) {
        const tripCountries = trip.places?.map(p => p.country) || []
        if (!tripCountries.includes(filters.country)) return false
      }

      return true
    })
  }, [trips, filters])

  // Sort trips
  const sortedTrips = useMemo(() => {
    const sorted = [...filteredTrips]
    
    switch (sortType) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      case 'alphabetical':
        return sorted.sort((a, b) => a.title.localeCompare(b.title))
      case 'duration':
        return sorted.sort((a, b) => getTripDuration(b) - getTripDuration(a))
      default:
        return sorted
    }
  }, [filteredTrips, sortType])

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center bg-neutral-900/40 px-4 sm:px-6 lg:px-8 py-4 shadow-[inset_0_1px_0_rgba(143,245,255,0.1)] backdrop-blur-xl">
        {/* Hamburger space placeholder */}
        <div className="w-10 sm:w-12" />
        
        {/* Title - centered */}
        <h1 className="flex-1 text-center text-xl sm:text-2xl font-bold text-[#8ff5ff] font-['Space Grotesk'] tracking-tight">
          Adventures
        </h1>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-4 w-10 sm:w-12 justify-end">
          <button className="p-2 text-[#b0b0b0] hover:text-[#8ff5ff] hover:bg-white/5 rounded-lg transition-all duration-300 active:scale-95">
            <span className="material-symbols-outlined text-base">search</span>
          </button>
          <Link href="/trip/new" className="btn-primary text-xs sm:text-sm flex items-center gap-1 sm:gap-2 group py-2 px-3 sm:px-4">
            <span className="material-symbols-outlined text-base group-hover:rotate-12 transition-transform duration-300">
              add
            </span>
            <span className="hidden sm:inline">New Trip</span>
            <span className="inline sm:hidden">New</span>
          </Link>
        </div>
      </header>

      {/* Floating Back Button */}
      <Link
        href="/"
        className="fixed bottom-8 right-8 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-black shadow-lg hover:shadow-primary/50 hover:shadow-[0_0_20px_rgba(143,245,255,0.3)] hover:scale-110 transition-all duration-300 active:scale-95"
        title="Back to home"
      >
        <span className="material-symbols-outlined text-2xl">
          arrow_back
        </span>
      </Link>

      <main className="w-full px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Filters & Controls */}
        <div className="mb-8 sm:mb-12 space-y-4 sm:space-y-6">
          {/* Filter Toggle Row */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-300">Filters & Sort</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-1.5 text-neutral-400 hover:text-[#8ff5ff] hover:bg-white/5 rounded-lg transition-all duration-300"
              title={showFilters ? 'Hide filters' : 'Show filters'}
            >
              <span className="material-symbols-outlined text-base transform transition-transform duration-300" style={{ transform: showFilters ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                {showFilters ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>

          {/* Collapsible Filters Section */}
          {showFilters && (
            <div className="space-y-4 sm:space-y-6">
              {/* Filter Row 1: Status & View Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Status Filter */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-neutral-400">Status:</label>
                  <div className="flex gap-2">
                    {(['all', 'active', 'upcoming', 'past'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => setFilters({ ...filters, status })}
                        className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${
                          filters.status === status
                            ? 'bg-primary text-black'
                            : 'bg-white/5 text-neutral-300 hover:bg-white/10'
                        }`}
                      >
                        {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1 border border-white/10">
                  {(['gallery', 'list'] as const).map(view => (
                    <button
                      key={view}
                      onClick={() => setViewType(view)}
                      className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-300 flex items-center gap-1 ${
                        viewType === view
                          ? 'bg-primary text-black'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">
                        {view === 'gallery' ? 'grid_view' : 'list'}
                      </span>
                      <span className="hidden sm:inline capitalize">{view}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Row 2: Year, Country & Sort */}
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                {/* Year Filter */}
                {uniqueYears.length > 0 && (
                  <select
                    value={filters.year || ''}
                    onChange={(e) => setFilters({ ...filters, year: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:border-white/20 focus:border-primary focus:outline-none transition-colors"
                  >
                    <option value="">All Years</option>
                    {uniqueYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                )}

                {/* Country Filter */}
                {uniqueCountries.length > 0 && (
                  <select
                    value={filters.country || ''}
                    onChange={(e) => setFilters({ ...filters, country: e.target.value || undefined })}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:border-white/20 focus:border-primary focus:outline-none transition-colors"
                  >
                    <option value="">All Countries</option>
                    {uniqueCountries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                )}

                {/* Sort */}
                <select
                  value={sortType}
                  onChange={(e) => setSortType(e.target.value as SortType)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:border-white/20 focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="alphabetical">Alphabetical</option>
                  <option value="duration">Longest Duration</option>
                </select>

                {/* Clear Filters */}
                {(filters.status !== 'all' || filters.year || filters.country) && (
                  <button
                    onClick={() => setFilters({ status: 'all' })}
                    className="px-3 py-2 text-xs sm:text-sm font-medium text-secondary hover:text-[#c3f400] transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-base">clear</span>
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Trips Display */}
        {sortedTrips.length === 0 ? (
          <div className="text-center py-16 sm:py-24">
            <div className="w-16 h-16 mx-auto rounded-full bg-secondary/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-secondary">exploration</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-headline font-bold text-white mb-2">
              No adventures yet
            </h3>
            <p className="text-body text-neutral-400 mb-6 max-w-md mx-auto">
              Create your first trip to start building your travel story.
            </p>
            <Link
              href="/trip/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined">add</span>
              <span>Create Trip</span>
            </Link>
          </div>
        ) : viewType === 'gallery' ? (
          // Gallery View
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {sortedTrips.map(trip => (
              <div key={trip.id} className="flex flex-col">
                <TripCard trip={trip} onDelete={deleteTrip} />
                <div className="mt-2 px-2 text-xs font-medium text-neutral-400 text-center">
                  {new Date(trip.startDate).getFullYear()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // List View
          <div className="space-y-3 sm:space-y-4">
            {sortedTrips.map(trip => {
              const status = getTripStatus(trip)
              const duration = getTripDuration(trip)
              const placeCount = trip.places?.length || 0
              
              return (
                <Link
                  key={trip.id}
                  href={`/trip/${trip.id}`}
                  className="group block p-4 sm:p-6 bg-white/5 border border-white/10 rounded-xl hover:border-primary/50 hover:bg-white/10 transition-all duration-300 overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                      {/* Trip Emoji */}
                      <div className="text-3xl sm:text-4xl flex-shrink-0 mt-1">
                        {trip.emoji || '📍'}
                      </div>

                      {/* Trip Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-primary transition-colors truncate">
                          {trip.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                          {new Date(trip.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                          {trip.endDate && (
                            <>
                              {' '}-{' '}
                              {new Date(trip.endDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            status === 'active' ? 'bg-primary/20 text-primary' :
                            status === 'upcoming' ? 'bg-secondary/20 text-secondary' :
                            'bg-neutral-700/50 text-neutral-300'
                          }`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-neutral-700/50 text-neutral-300">
                            {new Date(trip.startDate).getFullYear()}
                          </span>
                          {placeCount > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full font-medium bg-white/5 text-neutral-300">
                              {placeCount} {placeCount === 1 ? 'place' : 'places'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Trip Metadata */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm sm:text-base font-bold text-primary">
                        {duration} days
                      </p>
                      <p className="text-xs sm:text-sm text-neutral-500">
                        {placeCount} {placeCount === 1 ? 'stop' : 'stops'}
                      </p>
                    </div>

                    {/* Arrow Icon */}
                    <div className="flex-shrink-0 text-neutral-500 group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform duration-300">
                        arrow_forward
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
