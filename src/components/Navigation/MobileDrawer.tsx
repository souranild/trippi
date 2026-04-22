'use client'

import { useState } from 'react'
import { Trip } from '@/lib/storage'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface MobileDrawerProps {
  trip?: Trip | null
  onShare?: () => void
  onSettings?: () => void
  showHamburger?: boolean
}

export default function MobileDrawer({ trip, onShare, onSettings, showHamburger = true }: MobileDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const isOnTrip = trip !== null && trip !== undefined
  const isOnDashboard = pathname === '/'

  // Show hamburger everywhere (adventures page now has floating back button instead)
  const shouldShowHamburger = showHamburger

  const shareUrl = trip ? `${typeof window !== 'undefined' ? window.location.origin : ''}/trip/${trip.id}` : ''

  return (
    <>
      {/* Hamburger Button - conditionally visible */}
      {shouldShowHamburger && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-5 left-4 z-60 p-2 text-[#8ff5ff] hover:bg-white/10 rounded-lg transition-all duration-300 active:scale-95 hover:shadow-lg hover:shadow-cyan-400/30"
          aria-label="Toggle menu"
        >
          <span className={`material-symbols-outlined text-2xl transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            {isOpen ? 'close' : 'menu'}
          </span>
        </button>
      )}

      {/* Drawer Overlay - visible on all screens */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 transition-opacity duration-300 bg-[radial-gradient(circle_at_12%_18%,rgba(var(--glass-tint-rgb),0.22),transparent_38%),rgba(8,12,18,0.42)] backdrop-blur-lg"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer Panel - visible on all screens */}
      <div
        className={`fixed left-0 top-0 h-screen w-64 z-40 transform transition-transform duration-300 flex flex-col overflow-y-auto bg-[linear-gradient(145deg,rgba(18,24,32,0.72),rgba(24,30,38,0.5))] border-r border-[rgba(var(--glass-tint-rgb),0.34)] backdrop-blur-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Padding for safe area */}
        <div className="h-16" />

        {/* Main Navigation Items */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {/* Dashboard Link - always visible */}
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
              isOnDashboard
                ? 'bg-cyan-400/10 text-[#8ff5ff]'
                : 'text-[#b0b0b0] hover:bg-white/5 hover:text-[#8ff5ff]'
            }`}
          >
            <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
              home
            </span>
            <span className="text-sm font-medium">Dashboard</span>
          </Link>

          {/* My Trips Link */}
          <Link
            href="/adventures"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
              pathname === '/adventures'
                ? 'bg-cyan-400/10 text-[#8ff5ff]'
                : 'text-[#b0b0b0] hover:bg-white/5 hover:text-[#8ff5ff]'
            }`}
          >
            <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
              travel_explore
            </span>
            <span className="text-sm font-medium">Adventures</span>
          </Link>
        </nav>

        {/* Settings Section - Bottom */}
        <div className="border-t border-white/10 px-2 py-4 space-y-1">
          {/* Settings */}
          <button
            onClick={() => {
              onSettings?.()
              setIsOpen(false)
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#b0b0b0] hover:bg-white/5 hover:text-[#ff3333] transition-all duration-300 group cursor-pointer"
          >
            <span className="material-symbols-outlined text-base group-hover:rotate-180 transition-transform duration-500">
              settings
            </span>
            <span className="text-sm font-medium">Settings</span>
          </button>
        </div>
      </div>
    </>
  )
}
