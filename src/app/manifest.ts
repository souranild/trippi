import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Trippi',
    short_name: 'Trippi',
    description: 'A beautiful travel itinerary application',
    start_url: '/',
    display: 'standalone',
    background_color: '#0e0e0e',
    theme_color: '#8ff5ff',
    icons: [
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
