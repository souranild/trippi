'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trip } from '@/lib/storage'

interface SidebarProps {
  trip: Trip
  isOpen?: boolean
  onToggle?: () => void
  onShare?: () => void
  onSettings?: () => void
}

export default function Sidebar({ trip, isOpen = true, onToggle, onShare, onSettings }: SidebarProps) {
  const router = useRouter()

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/trip?id=${trip.id}`

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="hidden sm:flex fixed top-6 left-6 z-40 p-2 text-[#8ff5ff] hover:bg-white/10 rounded-lg transition-all duration-300 active:scale-95"
        aria-label="Toggle sidebar"
      >
        <span className="material-symbols-outlined text-2xl">
          {isOpen ? 'close' : 'menu'}
        </span>
      </button>

      {/* Sidebar */}
      <aside className={`hidden sm:flex sm:fixed sm:left-0 sm:top-0 sm:h-screen sm:flex-col sm:pt-20 sm:bg-[#0e0e0e] sm:border-r sm:border-white/10 sm:z-30 sm:transition-all sm:duration-300 ${isOpen ? 'sm:w-72' : 'sm:w-0 sm:overflow-hidden'}`}>
      {/* Trip Header */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{trip.emoji || '🌍'}</span>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white font-['Space Grotesk'] line-clamp-2">
              {trip.title}
            </h2>
            <p className="text-xs text-[#b0b0b0] mt-1">
              {trip.places?.length || 0} stops
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {/* Back to Trips */}
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#b0b0b0] hover:bg-white/5 hover:text-[#8ff5ff] transition-all duration-300 group"
        >
          <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
            arrow_back
          </span>
          <span className="text-sm font-medium">Back to Trips</span>
        </Link>

        {/* View Trip Details */}
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#b0b0b0] hover:bg-white/5 hover:text-[#8ff5ff] transition-all duration-300 group cursor-pointer">
          <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform">
            info
          </span>
          <span className="text-sm font-medium">Trip Details</span>
        </button>

        {/* Share Trip */}
        <button
          onClick={onShare}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#b0b0b0] hover:bg-white/5 hover:text-[#c3f400] transition-all duration-300 group cursor-pointer"
        >
          <span className="material-symbols-outlined text-base group-hover:rotate-12 transition-transform">
            share
          </span>
          <span className="text-sm font-medium">Share Trip</span>
        </button>

        {/* Collaborators */}
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#b0b0b0] hover:bg-white/5 hover:text-[#ff51fa] transition-all duration-300 group cursor-pointer">
          <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform">
            group
          </span>
          <span className="text-sm font-medium">Collaborators</span>
        </button>

        {/* Export Itinerary */}
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#b0b0b0] hover:bg-white/5 hover:text-[#8ff5ff] transition-all duration-300 group cursor-pointer">
          <span className="material-symbols-outlined text-base group-hover:translate-y-1 transition-transform">
            download
          </span>
          <span className="text-sm font-medium">Export Itinerary</span>
        </button>
      </nav>

      {/* Settings Section - Bottom */}
      <div className="border-t border-white/10 px-4 py-6 space-y-2">
        {/* Trip Settings */}
        <button
          onClick={onSettings}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#b0b0b0] hover:bg-white/5 hover:text-[#ff3333] transition-all duration-300 group cursor-pointer"
        >
          <span className="material-symbols-outlined text-base group-hover:rotate-180 transition-transform duration-500">
            settings
          </span>
          <span className="text-sm font-medium">Settings</span>
        </button>

        {/* Delete Trip */}
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#b0b0b0] hover:bg-red-500/10 hover:text-[#ff3333] transition-all duration-300 group cursor-pointer">
          <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform">
            delete_outline
          </span>
          <span className="text-sm font-medium">Delete Trip</span>
        </button>
      </div>

      {/* Share Link Info */}
      <div className="px-4 pb-4 text-xs text-[#808080] border-t border-white/10 pt-4">
        <p className="text-center">Share this link with friends:</p>
        <code className="block mt-2 p-2 bg-white/5 rounded text-[#8ff5ff] text-xs truncate text-center break-all">
          {shareUrl}
        </code>
      </div>
      </aside>
    </>
  )
}
