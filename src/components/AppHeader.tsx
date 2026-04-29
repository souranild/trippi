'use client'

import Link from 'next/link'
import EmojiAvatar from '@/components/EmojiAvatar'
import { useTrips } from '@/context/TripContext'

/**
 * Shared top navigation bar used across all pages.
 * Height is fixed at h-16 (64px) — consistent everywhere.
 *
 * - left:       replaces the default trippi logo (optional)
 * - center:     absolutely-centered content (optional)
 * - extraRight: items added to the LEFT of the always-visible profile pill
 */
interface AppHeaderProps {
  left?: React.ReactNode
  center?: React.ReactNode
  /** Items placed to the LEFT of the profile pill. Profile pill is always shown. */
  extraRight?: React.ReactNode
  onBack?: () => void
  className?: string
}

export default function AppHeader({ left, center, extraRight, onBack, className = '' }: AppHeaderProps) {
  const { userProfile, setIsEditingProfile } = useTrips()

  const defaultLeft = (
    <Link
      href="/"
      className="text-xl font-bold tracking-tighter text-[#8ff5ff] font-['Space_Grotesk'] hover:text-[#c3f400] transition-colors duration-300"
    >
      trippi
    </Link>
  )

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between bg-neutral-900/40 px-4 sm:px-6 shadow-[inset_0_1px_0_rgba(143,245,255,0.1)] backdrop-blur-xl ${className}`}
    >
      {/* Left — back button + logo or custom */}
      <div className="flex items-center gap-2 sm:gap-3 ml-12 sm:ml-16">
        {onBack && (
          <button
            onClick={onBack}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-neutral-400 hover:bg-neutral-800/60 hover:text-white transition-all duration-300 active:scale-95 shadow-lg shrink-0"
            aria-label="Back"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
          </button>
        )}
        <div className={center ? 'hidden md:block' : ''}>
          {left ?? defaultLeft}
        </div>
      </div>

      {/* Center — absolutely centered so it doesn't push siblings */}
      {center && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-none">
          <div className="pointer-events-auto">{center}</div>
        </div>
      )}

      {/* Right — extra items + profile pill (always visible) */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {extraRight}
        {userProfile && (
          <button
            onClick={() => setIsEditingProfile(true)}
            className={`flex items-center gap-2 px-2.5 py-1.5 bg-white/5 rounded-2xl border border-white/10 group hover:bg-white/10 hover:border-white/20 transition-all duration-300 active:scale-95 text-left ${center ? 'hidden md:flex' : 'flex'}`}
          >
            <EmojiAvatar
              emoji={userProfile.avatar}
              skinTone={userProfile.skinTone}
              size="sm"
              className="group-hover:scale-110 transition-transform bg-transparent shadow-none"
            />
            <span className="hidden sm:inline text-sm font-bold text-white pr-1 group-hover:text-cyan-400 transition-colors">
              {userProfile.name}
            </span>
          </button>
        )}
      </div>
    </header>
  )
}
