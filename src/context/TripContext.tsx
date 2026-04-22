'use client'

import React, { createContext, useContext, useState, useLayoutEffect, useCallback } from 'react'
import { Trip, loadTrips, saveTrips } from '@/lib/storage'

export interface UserProfile {
  name: string
  skinTone: string
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
}

const TripContext = createContext<TripContextType | undefined>(undefined)

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  // Load trips and user profile from localStorage on mount
  useLayoutEffect(() => {
    // Load trips
    const loadedTrips = loadTrips()
    if (loadedTrips.length > 0) {
      setTimeout(() => setTrips(loadedTrips), 0)
    }

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

  const addTrip = (trip: Trip) => {
    const updatedTrips = [...trips, trip]
    setTrips(updatedTrips)
    saveTrips(updatedTrips)
  }

  const updateTrip = (trip: Trip) => {
    const updatedTrips = trips.map((t) => (t.id === trip.id ? trip : t))
    setTrips(updatedTrips)
    saveTrips(updatedTrips)
  }

  const deleteTrip = (id: string) => {
    const updatedTrips = trips.filter((t) => t.id !== id)
    setTrips(updatedTrips)
    saveTrips(updatedTrips)
  }

  const getTripById = (id: string) => {
    return trips.find((t) => t.id === id)
  }

  const refreshTrips = useCallback(() => {
    const loadedTrips = loadTrips()
    setTrips(loadedTrips)
  }, [])

  const setUserProfileData = (profile: UserProfile) => {
    setUserProfile(profile)
    localStorage.setItem('userProfile', JSON.stringify(profile))
  }

  return (
    <TripContext.Provider
      value={{
        trips,
        addTrip,
        updateTrip,
        deleteTrip,
        getTripById,
        refreshTrips,
        userProfile,
        setUserProfile: setUserProfileData,
        hasCompletedOnboarding: userProfile !== null,
      }}
    >
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
