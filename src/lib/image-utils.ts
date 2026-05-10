import { searchWallpapers } from './wallpaper-search'
import { searchLocations, enrichDiscoveryResult } from './discovery'

const WIKI_API_ENDPOINT = 'https://en.wikipedia.org/w/api.php'

/**
 * Fetches Wikipedia images for a given title.
 */
async function fetchWikiImages(title: string): Promise<string[]> {
  try {
    const url = `${WIKI_API_ENDPOINT}?action=query&prop=pageimages|images&titles=${encodeURIComponent(title)}&pithumbsize=1000&imlimit=10&format=json&origin=*`
    const response = await fetch(url)
    const data = await response.json()
    
    const pages = data.query?.pages || {}
    const pageId = Object.keys(pages)[0]
    const page = pages[pageId]
 
    if (!page || page.missing === "") return []
 
    // Get more images if available
    const imageFiles = (page.images || [])
      .map((img: any) => img.title)
      .filter((t: string) => t.match(/\.(jpg|jpeg|png|webp)$/i))
      .slice(0, 5)
      
    const imageUrls = await Promise.all(imageFiles.map(async (fileTitle: string) => {
      const imgUrl = `${WIKI_API_ENDPOINT}?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url&format=json&origin=*`
      const imgRes = await fetch(imgUrl)
      const imgData = await imgRes.json()
      const imgPages = imgData.query?.pages || {}
      const imgPageId = Object.keys(imgPages)[0]
      return imgPages[imgPageId]?.imageinfo?.[0]?.url
    }))

    const validImages = imageUrls.filter(Boolean) as string[]
    const mainImage = page.thumbnail?.source
    
    if (mainImage && !validImages.includes(mainImage)) {
      validImages.unshift(mainImage)
    }

    return validImages
  } catch (e) {
    console.error('Wiki image fetch failed', e)
    return []
  }
}

/**
 * Validates a URL by checking if it's an image.
 */
async function isValidImageUrl(url: string): Promise<boolean> {
  if (!url) return false
  if (url.startsWith('data:')) return true
  try {
    const res = await fetch(url, { method: 'HEAD' })
    const contentType = res.headers.get('Content-Type')
    return contentType?.startsWith('image/') || false
  } catch {
    return false
  }
}

/**
 * Unified image fetcher following user priorities:
 * 1. Provided URLs (if valid)
 * 2. Wikipedia images
 * 3. Unsplash images
 */
export async function fetchPlaceImages(name: string, providedUrls: string[] = []): Promise<string[]> {
  const finalImages: string[] = []

  // 1. Priority: Provided URLs
  for (const url of providedUrls) {
    if (await isValidImageUrl(url)) {
      finalImages.push(url)
    }
  }

  if (finalImages.length >= 3) return finalImages.slice(0, 5)

  // 2. Priority: Wikipedia
  const wikiImages = await fetchWikiImages(name)
  for (const img of wikiImages) {
    if (!finalImages.includes(img)) {
      finalImages.push(img)
    }
    if (finalImages.length >= 5) break
  }

  if (finalImages.length >= 3) return finalImages.slice(0, 5)

  // 3. Priority: Unsplash
  try {
    const unsplashImages = await searchWallpapers(name)
    for (const img of unsplashImages) {
      if (!finalImages.includes(img)) {
        finalImages.push(img)
      }
      if (finalImages.length >= 8) break
    }
  } catch (e) {
    console.error('Unsplash search failed', e)
  }

  return finalImages.slice(0, 8)
}

/**
 * Robustly fetches location info (lat, lng, address, images) by name.
 */
export async function fetchLocationInfo(name: string) {
  if (!name || name.length < 3) return null

  try {
    const results = await searchLocations(name)
    if (results.length > 0) {
      const best = results[0]
      // Enrich with Wiki data if possible
      const enriched = await enrichDiscoveryResult(best)
      
      const images = await fetchPlaceImages(name, enriched.images || (enriched.image ? [enriched.image] : []))
      
      return {
        lat: enriched.lat,
        lng: enriched.lng,
        address: enriched.tags?.['addr:full'] || enriched.tags?.['addr:city'] || `${enriched.lat.toFixed(3)}, ${enriched.lng.toFixed(3)}`,
        description: enriched.description,
        images: images,
        type: enriched.type
      }
    }
  } catch (e) {
    console.error('fetchLocationInfo failed', e)
  }
  return null
}
