// Wallpaper service using Pexels API via Next.js API route
// Calls the server-side API route to avoid CORS and security issues

export interface WallpaperResult {
  url: string
  alt: string
  keywords?: string[]
}

const searchCache: Record<string, string[]> = {}

// Search wallpapers using the Next.js API route
export async function searchWikipediaImages(query: string): Promise<string[]> {
  const cacheKey = `wiki-${query}`
  if (searchCache[cacheKey]) return searchCache[cacheKey]

  try {
    const cleanedQuery = query.trim().replace(/^(Trip to|My|Our|Journey to)\s+/i, '')
    // Use local proxy to avoid CORS
    const response = await fetch(`/api/wiki-images?query=${encodeURIComponent(cleanedQuery)}`)
    if (response.ok) {
      const results = await response.json()
      searchCache[cacheKey] = results
      return results
    }
    return []
  } catch (error) {
    console.error('[Wiki API] Error:', error)
    return []
  }
}

// Search wallpapers using the Next.js API route
export async function searchWallpapers(query: string): Promise<string[]> {
  const cacheKey = `wall-${query}`
  if (searchCache[cacheKey]) return searchCache[cacheKey]

  console.log('[Wallpaper API] Searching for:', query)

  if (!query.trim()) {
    console.log('[Wallpaper API] Empty query, using default search')
    query = 'travel'
  }

  try {
    const [wikiImages, unsplashImages] = await Promise.all([
      searchWikipediaImages(query),
      fetch(`/api/wallpapers?query=${encodeURIComponent(query)}`).then(r => r.ok ? r.json() : [])
    ])

    const combinedUrls = [...wikiImages, ...unsplashImages]
    console.log(`[Wallpaper API] ✅ Found ${combinedUrls.length} combined images for query: "${query}"`)
    searchCache[cacheKey] = combinedUrls
    return combinedUrls


  } catch (error) {
    console.error('[Wallpaper API] Error:', error)
    console.log('[Wallpaper API] Falling back to curated images')
    return getCuratedFallback(query)
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
};

// Fallback function for when API fails
function getCuratedFallback(query: string): string[] {
  const lowerQuery = query.toLowerCase().trim();

  // Try to find a matching curated collection
  for (const [key, images] of Object.entries(CURATED_COLLECTIONS)) {
    if (lowerQuery.includes(key)) {
      return images;
    }
  }

  // Default to travel images
  return CURATED_COLLECTIONS['travel'] || [];
}

// Get a random placeholder image
export function getRandomPlaceholder(): string {
  const travelImages = CURATED_COLLECTIONS['travel'] || [];
  const randomIndex = Math.floor(Math.random() * travelImages.length);
  return travelImages[randomIndex] || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&h=1080&fit=crop';
}

/**
 * Fetches a few beautiful scenery images from Unsplash to use as defaults
 */
export async function getDiscoveryWallpapers(): Promise<string[]> {
  try {
    const sceneries = ['nature', 'mountains', 'landscape', 'stars', 'aurora', 'forest']
    const randomScenery = sceneries[Math.floor(Math.random() * sceneries.length)]
    const response = await fetch(`/api/wallpapers?query=${encodeURIComponent(randomScenery)}`)
    if (response.ok) {
      const urls = await response.json()
      return urls.slice(0, 5)
    }
    return getCuratedFallback('travel').slice(0, 5)
  } catch (error) {
    console.error('[Wallpaper API] Discovery error:', error)
    return getCuratedFallback('travel').slice(0, 5)
  }
}