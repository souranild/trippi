'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTrips } from '@/context/TripContext'
import TripForm from '@/components/TripForm'
import { Place } from '@/lib/storage'
import AppHeader from '@/components/AppHeader'
import ParallaxBackground from '@/components/ParallaxBackground'
import { ModalContainer, ModalHeader, ModalContent } from '@/components/ModalLayout'

export default function NewTrip() {
  const router = useRouter()
  const { addTrip } = useTrips()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [wallpaper, setWallpaper] = useState('')

  const handleSubmit = async (data: {
    emoji: string
    title: string
    description: string
    startDate: string
    endDate: string
    wallpaper: string
    places?: Place[]
    tags?: string[]
  }) => {
    setIsSubmitting(true)
    const newTrip = {
      id: Date.now().toString(),
      title: data.title,
      description: data.description,
      emoji: data.emoji,
      wallpaper: data.wallpaper,
      startDate: data.startDate,
      endDate: data.endDate,
      places: data.places || [],
      tags: data.tags || []
    }
    await addTrip(newTrip)
    router.push(`/trip/${newTrip.id}?addFirstPlace=true`)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white font-body selection:bg-primary selection:text-black">
      {/* Dynamic Background */}
      <ParallaxBackground 
        src={wallpaper} 
        opacity={0.6} 
        parallaxFactor={0.1}
      />

      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
          backgroundSize: '32px 32px',
          backgroundPosition: 'center center'
        }}
      />

      <AppHeader onBack={() => router.push('/')} />

      <main className="relative z-10 min-h-screen pt-24 pb-24 px-4 sm:px-6 flex items-center justify-center">
        <div className="w-full max-w-4xl animate-in fade-in zoom-in-95 duration-700">
          <ModalContainer 
            size="lg" 
            tint="rgba(34, 211, 238, 0.05)"
            className="!max-h-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)]"
          >
            <ModalHeader 
              title="Create New Trip" 
              subtitle="Where will your next adventure take you?"
              onClose={() => router.push('/')}
              leading={
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg text-primary">add_location_alt</span>
                </div>
              }
            />
            <ModalContent className="!p-0">
              <div className="p-6 md:p-10">
                <TripForm
                  onSubmit={handleSubmit}
                  onCancel={() => router.push('/')}
                  isSubmitting={isSubmitting}
                  submitButtonText="Create Trip"
                  onWallpaperChange={setWallpaper}
                  hideBackground={true}
                  hideActions={false}
                />
              </div>
            </ModalContent>
          </ModalContainer>

          <p className="mt-8 text-center text-neutral-500 text-[10px] font-bold uppercase tracking-[0.3em] animate-pulse">
            Your journey begins here
          </p>
        </div>
      </main>
    </div>
  )
}
