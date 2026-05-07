'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTrips } from '@/context/TripContext'
import TripForm from '@/components/TripForm'
import AppHeader from '@/components/AppHeader'
import ParallaxBackground from '@/components/ParallaxBackground'

export default function NewTrip() {
  const router = useRouter()
  const { addTrip } = useTrips()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [wallpaper, setWallpaper] = useState('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop')

  const handleSubmit = async (data: {
    emoji: string
    title: string
    description: string
    startDate: string
    endDate: string
    wallpaper: string
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
      places: [],
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

      {/* Construction Tapes - Always on for creation */}
      <div className="fixed top-16 left-0 right-0 h-2 z-40 overflow-hidden backdrop-blur-sm bg-black/20 border-b border-yellow-500/20 animate-in slide-in-from-top duration-700">
        <div 
          className="w-[200%] h-full animate-scroll-tape-left opacity-90"
          style={{ background: 'repeating-linear-gradient(45deg, #facc15, #facc15 12px, #000 12px, #000 24px)' }}
        />
      </div>
      <div className="fixed bottom-0 left-0 right-0 h-2 z-[2000] overflow-hidden backdrop-blur-sm bg-black/20 border-t border-yellow-500/20 animate-in slide-in-from-bottom duration-700">
        <div 
          className="w-[200%] h-full animate-scroll-tape-right opacity-90"
          style={{ background: 'repeating-linear-gradient(45deg, #facc15, #facc15 12px, #000 12px, #000 24px)' }}
        />
      </div>

      <AppHeader onBack={() => router.push('/')} />

      <main className="relative z-10 min-h-screen pt-32 pb-32 px-6 md:px-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <span className="material-symbols-outlined text-sm text-primary animate-pulse">rocket_launch</span>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">New Adventure</span>
            </div>
            <h1 className="font-headline text-5xl font-black text-white mb-4 tracking-tight">Create Your Trip</h1>
            <p className="text-neutral-400 font-medium">Plan your next unforgettable journey across the world.</p>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <TripForm
              onSubmit={handleSubmit}
              onCancel={() => router.push('/')}
              isSubmitting={isSubmitting}
              submitButtonText="Create Trip"
              onWallpaperChange={setWallpaper}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
