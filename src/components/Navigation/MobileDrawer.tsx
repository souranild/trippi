import { useState } from 'react'
import { Trip } from '@/lib/storage'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTrips } from '@/context/TripContext'
import EmojiAvatar from '@/components/EmojiAvatar'

interface MobileDrawerProps {
  trip?: Trip | null
  onShare?: () => void
  onSettings?: () => void
  onDelete?: () => void
  onEditProfile?: () => void
  showHamburger?: boolean
}

export default function MobileDrawer({ trip, onShare, onSettings, onDelete, onEditProfile, showHamburger = true }: MobileDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { userProfile } = useTrips()
  const isOnTrip = trip !== null && trip !== undefined
  const isOnDashboard = pathname === '/'

  // Show hamburger everywhere (adventures page now has floating back button instead)
  const shouldShowHamburger = showHamburger

  return (
    <>
      {/* Hamburger Button - conditionally visible */}
      {shouldShowHamburger && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-0 left-0 z-[60] h-16 w-16 flex items-center justify-center text-[#8ff5ff] hover:text-white transition-all duration-300 active:scale-95"
          aria-label="Toggle menu"
        >
          <span className={`material-symbols-outlined text-2xl transform transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}>
            {isOpen ? 'close' : 'menu'}
          </span>
        </button>
      )}

      {/* Drawer Overlay - visible on all screens */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 transition-opacity duration-300 bg-slate-950/40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer Panel - visible on all screens */}
      <div
        className={`fixed left-0 top-0 h-screen w-72 z-40 transform transition-transform duration-500 flex flex-col overflow-y-auto bg-slate-900/95 border-r border-white/5 backdrop-blur-3xl shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Profile Header */}
        <div className="pt-20 pb-6 px-6">
          <button 
            onClick={() => {
              onEditProfile?.()
              setIsOpen(false)
            }}
            className="group w-full flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all duration-300 text-left"
          >
            <EmojiAvatar 
              emoji={userProfile?.avatar || '👤'} 
              skinTone={userProfile?.skinTone || 'medium'} 
              size="lg"
              className="group-hover:scale-110 transition-transform"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-cyan-400 mb-0.5">Explorer</p>
              <h4 className="text-white font-bold truncate">
                {userProfile?.name || 'Anonymous'}
              </h4>
            </div>
            <span className="material-symbols-outlined text-neutral-600 group-hover:text-cyan-400 transition-colors">edit_square</span>
          </button>
        </div>

        {/* Main Navigation Items */}
        <nav className="flex-1 px-4 py-2 space-y-1">
          {/* Dashboard Link - always visible */}
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${
              isOnDashboard
                ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                : 'text-neutral-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
              home
            </span>
            <span className="text-sm font-bold">Dashboard</span>
          </Link>

          {/* Adventures Link */}
          <Link
            href="/adventures"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${
              pathname === '/adventures'
                ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                : 'text-neutral-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
              travel_explore
            </span>
            <span className="text-sm font-bold">Adventures</span>
          </Link>

          {/* Trip specific items */}
          {isOnTrip && (
            <>
              <div className="pt-6 pb-2 px-4">
                <p className="text-xs font-bold text-neutral-600">Active Voyage</p>
              </div>
              
              {/* Share Trip */}
              <button
                onClick={() => {
                  onShare?.()
                  setIsOpen(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-neutral-400 hover:bg-white/5 hover:text-white transition-all duration-300 group cursor-pointer"
              >
                <span className="material-symbols-outlined text-base group-hover:rotate-12 transition-transform">
                  share
                </span>
                <span className="text-sm font-bold">Share</span>
              </button>

              {/* Collaborators */}
              <button 
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-neutral-400 hover:bg-white/5 hover:text-white transition-all duration-300 group cursor-pointer"
              >
                <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform">
                  group
                </span>
                <span className="text-sm font-bold">Friends</span>
              </button>
            </>
          )}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-white/5 p-4 space-y-1">
          <button
            onClick={() => {
              onEditProfile?.()
              setIsOpen(false)
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-neutral-400 hover:bg-white/5 hover:text-cyan-400 transition-all duration-300 group cursor-pointer"
          >
            <span className="material-symbols-outlined text-base group-hover:rotate-45 transition-transform">
              person
            </span>
            <span className="text-sm font-bold">Edit Profile</span>
          </button>

          <button
            onClick={() => {
              onSettings?.()
              setIsOpen(false)
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-neutral-400 hover:bg-white/5 hover:text-white transition-all duration-300 group cursor-pointer"
          >
            <span className="material-symbols-outlined text-base group-hover:rotate-180 transition-transform duration-500">
              settings
            </span>
            <span className="text-sm font-bold">Settings</span>
          </button>

          {isOnTrip && (
            <button 
              onClick={() => {
                onDelete?.()
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-neutral-400 hover:bg-red-500/10 hover:text-[#ff3333] transition-all duration-300 group cursor-pointer"
            >
              <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform">
                delete_outline
              </span>
              <span className="text-sm font-bold">Delete Voyage</span>
            </button>
          )}
        </div>
      </div>
    </>
  )
}
