'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useTrips } from '@/context/TripContext'
import { defaultWallpaperTint, extractWallpaperTint } from '@/lib/wallpaper-tint'

function findActiveWallpaper(pathname: string, trips: ReturnType<typeof useTrips>['trips']): string | undefined {
  const tripMatch = pathname.match(/^\/trip\/([^/]+)$/)
  if (tripMatch && tripMatch[1] !== 'new') {
    const currentTrip = trips.find((trip) => trip.id === tripMatch[1])
    if (currentTrip?.wallpaper) return currentTrip.wallpaper
  }

  const now = new Date()
  const activeTrip = trips.find((trip) => {
    if (!trip.wallpaper) return false
    const start = new Date(trip.startDate)
    const end = trip.endDate
      ? new Date(trip.endDate)
      : new Date(start.getTime() + 10 * 24 * 60 * 60 * 1000)
    return start <= now && now <= end
  })

  if (activeTrip?.wallpaper) return activeTrip.wallpaper

  const latestWithWallpaper = [...trips]
    .filter((trip) => Boolean(trip.wallpaper))
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0]

  return latestWithWallpaper?.wallpaper
}

export default function WallpaperTintSync() {
  const pathname = usePathname()
  const { trips } = useTrips()

  useEffect(() => {
    let cancelled = false
    const root = document.documentElement
    const wallpaper = findActiveWallpaper(pathname, trips)

    const applyTint = async () => {
      const tint = wallpaper ? await extractWallpaperTint(wallpaper) : defaultWallpaperTint()
      if (cancelled) return

      root.style.setProperty('--wallpaper-secondary', tint.hex)
      root.style.setProperty('--wallpaper-secondary-rgb', `${tint.rgb[0]}, ${tint.rgb[1]}, ${tint.rgb[2]}`)
      root.style.setProperty('--glass-tint-rgb', `${tint.rgb[0]}, ${tint.rgb[1]}, ${tint.rgb[2]}`)
    }

    applyTint()

    return () => {
      cancelled = true
    }
  }, [pathname, trips])

  return null
}
