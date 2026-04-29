'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTrips } from '@/context/TripContext'
import TripForm from '@/components/TripForm'
import AppHeader from '@/components/AppHeader'

export default function NewTrip() {
  const router = useRouter()
  const { addTrip } = useTrips()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)

  const handleSubmit = async (data: {
    emoji: string
    title: string
    description: string
    startDate: string
    endDate: string
    wallpaper: string
  }) => {
    setIsSubmitting(true)

    // Create trip object with generated ID
    const newTrip = {
      id: Date.now().toString(),
      title: data.title,
      description: data.description,
      emoji: data.emoji,
      wallpaper: data.wallpaper,
      startDate: data.startDate,
      endDate: data.endDate,
      places: [],
    }

    await addTrip(newTrip)
    router.push(`/trip/${newTrip.id}?addFirstPlace=true`)
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-body">
      {/* Top Header */}
      <AppHeader onBack={() => window.history.back()} />

      {/* Account Menu Panel */}
      <div className={`fixed right-0 top-0 h-full w-80 z-50 transform transition-transform duration-300 ease-in-out bg-[linear-gradient(145deg,rgba(18,24,32,0.74),rgba(26,32,40,0.52))] border-l border-[rgba(var(--glass-tint-rgb),0.34)] backdrop-blur-2xl ${
        isAccountMenuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white font-headline">Account</h2>
            <button
              onClick={() => setIsAccountMenuOpen(false)}
              className="p-2 text-neutral-400 hover:bg-neutral-800/50 transition-colors rounded-full active:scale-95 duration-150"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Profile Section */}
          <div className="flex items-center gap-4 mb-8 p-4 bg-surface-container-highest rounded-lg">
            <div className="w-16 h-16 rounded-full bg-surface-container-highest border border-outline-variant/30 overflow-hidden">
              <img alt="Profile" src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face" />
            </div>
            <div>
              <p className="text-white font-bold font-headline text-lg">Alex</p>
              <p className="text-neutral-500 text-sm">Traveler</p>
              <p className="text-neutral-600 text-xs">alex@example.com</p>
            </div>
          </div>

          {/* Account Options */}
          <div className="space-y-2">
            <button className="w-full flex items-center gap-3 p-4 text-left text-white hover:bg-neutral-800/50 transition-colors rounded-lg active:scale-95 duration-150">
              <span className="material-symbols-outlined">person</span>
              <span>Profile Settings</span>
            </button>
            <button className="w-full flex items-center gap-3 p-4 text-left text-white hover:bg-neutral-800/50 transition-colors rounded-lg active:scale-95 duration-150">
              <span className="material-symbols-outlined">notifications</span>
              <span>Notifications</span>
            </button>
            <button className="w-full flex items-center gap-3 p-4 text-left text-white hover:bg-neutral-800/50 transition-colors rounded-lg active:scale-95 duration-150">
              <span className="material-symbols-outlined">security</span>
              <span>Privacy & Security</span>
            </button>
            <button className="w-full flex items-center gap-3 p-4 text-left text-white hover:bg-neutral-800/50 transition-colors rounded-lg active:scale-95 duration-150">
              <span className="material-symbols-outlined">help</span>
              <span>Help & Support</span>
            </button>
            <button className="w-full flex items-center gap-3 p-4 text-left text-white hover:bg-neutral-800/50 transition-colors rounded-lg active:scale-95 duration-150">
              <span className="material-symbols-outlined">logout</span>
              <span>Sign Out</span>
            </button>
          </div>

          {/* App Info */}
          <div className="mt-8 pt-6 border-t border-neutral-800/30">
            <div className="text-center">
              <p className="text-neutral-500 text-sm">Trippi v1.0.0</p>
              <p className="text-neutral-600 text-xs mt-1">© 2026 Trippi Inc.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isAccountMenuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-[radial-gradient(circle_at_12%_18%,rgba(var(--glass-tint-rgb),0.22),transparent_38%),rgba(8,12,18,0.42)] backdrop-blur-lg"
          onClick={() => setIsAccountMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="relative min-h-screen pt-24 pb-32 px-6 md:px-10">
        <div className="relative z-10 min-h-screen">
          <div className="mx-auto max-w-4xl mb-6 text-center md:mb-8">
            <h1 className="font-headline text-2xl font-bold text-white">Create New Trip</h1>
            <p className="text-sm text-neutral-300">Plan your next adventure</p>
          </div>

          <TripForm
            onSubmit={handleSubmit}
            onCancel={() => window.history.back()}
            isSubmitting={isSubmitting}
            submitButtonText="Create Trip"
          />
        </div>
      </main>
    </div>
  )
}
