'use client'

import { TripProvider, useTrips } from '@/context/TripContext'
import NavigationLayout from '@/components/Navigation/NavigationLayout'
import OnboardingScreen from '@/components/OnboardingScreen'
import type { UserProfile } from '@/context/TripContext'
import WallpaperTintSync from '@/components/Theme/WallpaperTintSync'
import AnimatedParticleBackground from '@/components/AnimatedParticleBackground'

import { MapProvider } from '@/context/MapContext'
import PersistentMapHost from '@/components/Map/PersistentMapHost'
import ExpandedMapModal from '@/components/Map/ExpandedMapModal'

function ProvidersContent({ children }: { children: React.ReactNode }) {
  const { setUserProfile, hasCompletedOnboarding, trips } = useTrips()

  if (!hasCompletedOnboarding) {
    return (
      <OnboardingScreen
        onComplete={(profile: UserProfile) => {
          setUserProfile(profile)
        }}
      />
    )
  }

  return (
    <>
      <WallpaperTintSync />
      <AnimatedParticleBackground trips={trips} />
      <NavigationLayout>{children}</NavigationLayout>
    </>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TripProvider>
      <MapProvider>
        <ProvidersContent>{children}</ProvidersContent>
        <PersistentMapHost />
        <ExpandedMapModal />
      </MapProvider>
    </TripProvider>
  )
}
