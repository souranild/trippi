'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { ReactNode, useState } from 'react'
import MobileDrawer from './MobileDrawer'
import { useTrips } from '@/context/TripContext'
import OnboardingScreen from '@/components/OnboardingScreen'
import { ConfirmationModal } from '@/components/ConfirmationModal'

interface NavigationLayoutProps {
  children: ReactNode
}

export default function NavigationLayout({ children }: NavigationLayoutProps) {
  const pathname = usePathname()
  const { getTripById, userProfile, setUserProfile, deleteTrip, isEditingProfile, setIsEditingProfile } = useTrips()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const searchParams = useSearchParams()
  const tripId = pathname === '/trip' ? searchParams.get('id') : null
  const trip = tripId ? getTripById(tripId) : null

  // Always show mobile drawer with hamburger menu
  const showMobileNav = true

  const handleShare = () => {
    if (!trip) return
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/trip?id=${trip.id}`
    navigator.clipboard.writeText(shareUrl)
    alert('Trip link copied to clipboard!')
  }

  const handleSettings = () => {
    alert('Trip settings modal coming soon!')
  }

  const handleDeleteTrip = () => {
    if (!trip) return
    setShowDeleteConfirm(true)
  }

  return (
    <div className="flex w-full">
      {/* Profile Editor Modal Overlay */}
      {isEditingProfile && (
        <OnboardingScreen 
          initialProfile={userProfile}
          onComplete={(profile) => {
            setUserProfile(profile)
            setIsEditingProfile(false)
          }}
          onCancel={() => setIsEditingProfile(false)}
        />
      )}

      {/* Mobile Drawer - always visible with hamburger menu */}
      {showMobileNav && (
        <MobileDrawer 
          trip={trip} 
          onShare={trip ? handleShare : undefined} 
          onSettings={trip ? handleSettings : undefined}
          onDelete={handleDeleteTrip}
          onEditProfile={() => setIsEditingProfile(true)}
          showHamburger={true}
        />
      )}

      {/* Main Content */}
      <main className="w-full">
        {children}
      </main>

      {trip && (
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          title="Delete Trip?"
          message={`Are you sure you want to delete "${trip.title}"? This cannot be undone.`}
          onConfirm={() => {
            deleteTrip(trip.id)
            window.location.href = '/adventures'
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
