'use client'

import { TripProvider, useTrips } from '@/context/TripContext'
import NavigationLayout from '@/components/Navigation/NavigationLayout'
import OnboardingScreen from '@/components/OnboardingScreen'
import type { UserProfile } from '@/context/TripContext'
import WallpaperTintSync from '@/components/Theme/WallpaperTintSync'

function ProvidersContent({ children }: { children: React.ReactNode }) {
  const { setUserProfile, hasCompletedOnboarding } = useTrips()

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
      <NavigationLayout>{children}</NavigationLayout>
    </>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TripProvider>
      <ProvidersContent>{children}</ProvidersContent>
    </TripProvider>
  )
}
