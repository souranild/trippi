'use client'

import React, { createContext, useContext, useState, useLayoutEffect, useCallback, useMemo } from 'react'
import { Trip, loadTrips, saveTrips } from '@/lib/storage'

export interface UserProfile {
  name: string
  skinTone: string
  avatar: string
}

interface TripContextType {
  trips: Trip[]
  addTrip: (trip: Trip) => void
  updateTrip: (trip: Trip) => void
  deleteTrip: (id: string) => void
  getTripById: (id: string) => Trip | undefined
  refreshTrips: () => void
  userProfile: UserProfile | null
  setUserProfile: (profile: UserProfile) => void
  hasCompletedOnboarding: boolean
  isEditingProfile: boolean
  setIsEditingProfile: (isEditing: boolean) => void
}

const TripContext = createContext<TripContextType | undefined>(undefined)

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  // Load trips and user profile from localStorage on mount
  useLayoutEffect(() => {
    // Load trips (now async)
    loadTrips().then(loadedTrips => {
      if (loadedTrips && loadedTrips.length > 0) {
        setTrips(loadedTrips)
      }
    })

    // Load user profile from localStorage
    const storedProfile = localStorage.getItem('userProfile')
    if (storedProfile) {
      try {
        const profile = JSON.parse(storedProfile)
        setTimeout(() => setUserProfile(profile), 0)
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [])

  const addTrip = useCallback(async (trip: Trip) => {
    setTrips(prev => {
      const updated = [...prev, trip]
      saveTrips(updated)
      return updated
    })
  }, [])

  const updateTrip = useCallback(async (trip: Trip) => {
    setTrips(prev => {
      const updated = prev.map((t) => (t.id === trip.id ? trip : t))
      saveTrips(updated)
      return updated
    })
  }, [])

  const deleteTrip = useCallback(async (id: string) => {
    setTrips(prev => {
      const updated = prev.filter((t) => t.id !== id)
      saveTrips(updated)
      return updated
    })
  }, [])

  const getTripById = useCallback((id: string) => {
    return trips.find((t) => t.id === id)
  }, [trips])

  const refreshTrips = useCallback(async () => {
    const loadedTrips = await loadTrips()
    setTrips(loadedTrips)
  }, [])

  const setUserProfileData = useCallback((profile: UserProfile) => {
    setUserProfile(profile)
    localStorage.setItem('userProfile', JSON.stringify(profile))
  }, [])

  const contextValue = useMemo(() => ({
    trips,
    addTrip,
    updateTrip,
    deleteTrip,
    getTripById,
    refreshTrips,
    userProfile,
    setUserProfile: setUserProfileData,
    hasCompletedOnboarding: userProfile !== null,
    isEditingProfile,
    setIsEditingProfile,
  }), [
    trips,
    addTrip,
    updateTrip,
    deleteTrip,
    getTripById,
    refreshTrips,
    userProfile,
    isEditingProfile,
    setUserProfileData,
    setIsEditingProfile
  ])
  return (
    <TripContext.Provider value={contextValue}>
      {children}
    </TripContext.Provider>
  )
}

export function useTrips() {
  const context = useContext(TripContext)
  if (context === undefined) {
    throw new Error('useTrips must be used within TripProvider')
  }
  return context
}
