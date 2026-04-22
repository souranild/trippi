import { NextRequest, NextResponse } from 'next/server'

// Set environment variable to ignore SSL certificate errors for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const PEXELS_API_KEY = '5e5IjexyWnd7HCoC27fi5CyXDpuwpCWrtXHdwFLhMRb0JglvG4n65vM5'
const PEXELS_BASE_URL = 'https://api.pexels.com/v1'

// Pexels API response interface
interface PexelsPhoto {
  id: number
  width: number
  height: number
  url: string
  photographer: string
  photographer_url: string
  photographer_id: number
  avg_color: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    small: string
    portrait: string
    landscape: string
    tiny: string
  }
  liked: boolean
  alt: string
}

interface PexelsResponse {
  total_results: number
  page: number
  per_page: number
  photos: PexelsPhoto[]
  next_page?: string
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
  }

  console.log('[Pexels API] Searching for:', query)

  if (!query.trim()) {
    console.log('[Pexels API] Empty query, using default search')
    // Return empty array for empty queries
    return NextResponse.json([])
  }

  try {
    console.log('[Pexels API] Making request to:', `${PEXELS_BASE_URL}/search?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`)
    const response = await fetch(
      `${PEXELS_BASE_URL}/search?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`,
      {
        headers: {
          'Authorization': PEXELS_API_KEY,
        }
      }
    )
    console.log('[Pexels API] Response status:', response.status)

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status} ${response.statusText}`)
    }

    const data: PexelsResponse = await response.json()

    if (!data.photos || data.photos.length === 0) {
      console.log('[Pexels API] No results found, falling back to curated images')
      return NextResponse.json(getCuratedFallback(query))
    }

    // Extract high-quality image URLs (large size for wallpaper quality)
    const imageUrls = data.photos.map(photo => photo.src.large)

    console.log(`[Pexels API] ✅ Found ${imageUrls.length} images for query: "${query}"`)
    return NextResponse.json(imageUrls)

  } catch (error) {
    console.error('[Pexels API] Error:', error)
    console.log('[Pexels API] Falling back to curated images')
    return NextResponse.json(getCuratedFallback(query))
  }
}

// Curated fallback images for when API fails or for common queries
const CURATED_COLLECTIONS: Record<string, string[]> = {
  'paris': [
    'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=1920&h=1080&fit=crop',
    'https://images.unsplash.com/photo-1549144511-f099e773c147?w=1920&h=1080&fit=crop',
    'https://images.unsplash.com/photo-1509439581779-6298f75bf6e5?w=1920&h=1080&fit=crop'
  ],
  'beach': [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920&h=1080&fit=crop',
    'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1920&h=1080&fit=crop'
  ],
  'mountains': [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    'https://images.unsplash.com/photo-1464822759844-d150f39b8d33?w=1920&h=1080&fit=crop'
  ],
  'travel': [
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&h=1080&fit=crop',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop'
  ]
}

// Fallback function for when API fails
function getCuratedFallback(query: string): string[] {
  const lowerQuery = query.toLowerCase().trim()

  // Try to find a matching curated collection
  for (const [key, images] of Object.entries(CURATED_COLLECTIONS)) {
    if (lowerQuery.includes(key)) {
      return images
    }
  }

  // Default to travel images
  return CURATED_COLLECTIONS['travel'] || []
}