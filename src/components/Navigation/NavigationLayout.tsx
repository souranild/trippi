'use client'

import { usePathname } from 'next/navigation'
import { ReactNode, useState } from 'react'
import Sidebar from './Sidebar'
import MobileDrawer from './MobileDrawer'
import { useTrips } from '@/context/TripContext'

interface NavigationLayoutProps {
  children: ReactNode
}

export default function NavigationLayout({ children }: NavigationLayoutProps) {
  const pathname = usePathname()
  const { getTripById, userProfile } = useTrips()
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-open')
      return saved !== null ? JSON.parse(saved) : true
    }
    return true
  })

  // Extract trip ID from pathname (e.g., /trip/123 → 123)
  const tripMatch = pathname.match(/^\/trip\/(.+)$/)
  const tripId = tripMatch ? tripMatch[1] : null
  const trip = tripId ? getTripById(tripId) : null

  // Only show desktop sidebar on trip detail pages
  const showDesktopNav = trip !== undefined && trip !== null
  // Always show mobile drawer with hamburger menu
  const showMobileNav = true

  const handleToggle = () => {
    const newState = !isSidebarOpen
    setIsSidebarOpen(newState)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-open', JSON.stringify(newState))
    }
  }

  const handleShare = () => {
    if (!trip) return
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/trip/${trip.id}`
    navigator.clipboard.writeText(shareUrl)
    alert('Trip link copied to clipboard!')
  }

  const handleSettings = () => {
    alert('Trip settings modal coming soon!')
  }

  return (
    <div className="flex w-full">
      {/* Desktop Sidebar - only on trip detail pages */}
      {showDesktopNav && trip && (
        <Sidebar trip={trip} isOpen={isSidebarOpen} onToggle={handleToggle} onShare={handleShare} onSettings={handleSettings} />
      )}

      {/* Mobile Drawer - always visible with hamburger menu */}
      {showMobileNav && (
        <MobileDrawer 
          trip={trip} 
          onShare={showDesktopNav && trip ? handleShare : undefined} 
          onSettings={showDesktopNav && trip ? handleSettings : undefined}
          showHamburger={true}
        />
      )}

      {/* Main Content - adjusted for sidebar on desktop */}
      <main className={showDesktopNav && isSidebarOpen ? 'sm:ml-72 w-full' : 'w-full'}>
        {children}
      </main>
    </div>
  )
}
