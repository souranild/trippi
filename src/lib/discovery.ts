/**
 * Trippi Discovery Engine
 * Implements "Smart Hybrid Suggestions" using Overpass API and MediaWiki.
 */

export interface DiscoveryResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  tags: Record<string, string>;
  image?: string;
  images?: string[];
  description?: string;
  significance?: number; // Sitelink count or similar
  distance?: number; // Distance from center in km
}

export const MAP_ICON: Record<string, string> = {
  'hotel': 'hotel',
  'apartment': 'apartment',
  'house': 'house',
  'motel': 'motel',
  'hostel': 'hotel',
  'resort': 'beach_access',
  'restaurant': 'restaurant',
  'cafe': 'cafe',
  'bar': 'local_bar',
  'pub': 'local_bar',
  'fast_food': 'fastfood',
  'food_court': 'restaurant',
  'museum': 'museum',
  'viewpoint': 'visibility',
  'attraction': 'star',
  'zoo': 'pets',
  'theme_park': 'attractions',
  'monument': 'account_balance',
  'castle': 'fort',
  'ruins': 'foundation',
  'theatre': 'theater_comedy',
  'gallery': 'palette',
  'park': 'park',
  'nature_reserve': 'forest',
  'garden': 'local_florist',
  'beach': 'beach_access',
  'airport': 'flight',
  'station': 'train',
  'bus_stop': 'directions_bus',
  'subway': 'subway',
  'pier': 'sailing',
  'city': 'location_city',
}

export function getIconForType(type?: string): string {
  if (!type) return 'location_on'
  const t = type.toLowerCase()
  return MAP_ICON[t] || 'location_on'
}

/**
 * Robust fetch for Overpass via local proxy to avoid CORS/Network issues
 */
async function fetchOverpass(query: string, signal?: AbortSignal): Promise<any> {
  try {
    const response = await fetch('/api/discovery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      signal
    });
    
    if (response.ok) return await response.json();

    let err: any = null;
    try {
      err = await response.json();
    } catch {
      err = null;
    }

    const message = err?.error || `Proxy fetch failed (${response.status})`;
    // Mirror outages are expected occasionally; treat as soft-failure.
    if (response.status >= 500) {
      console.warn('Discovery proxy unavailable:', message);
      return { elements: [] };
    }

    throw new Error(message);
  } catch (e: any) {
    if (e.name === 'AbortError') throw e;
    // Network/CORS/proxy failures should not break map interactions.
    console.warn('Proxy Discovery Error:', e);
    return { elements: [] };
  }
}

const WIKI_API_ENDPOINT = 'https://en.wikipedia.org/w/api.php';

/**
 * Search via Nominatim for better global/text results (same as OSM.org)
 */
async function fetchNominatimSearch(q: string, lat?: number, lng?: number, signal?: AbortSignal): Promise<DiscoveryResult[]> {
  try {
    // Bias results towards current view if possible, but only if coordinates are valid numbers
    const hasValidCoords = lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng);
    const viewboxParam = hasValidCoords ? `&viewbox=${lng-2},${lat+2},${lng+2},${lat-2}&bounded=0` : '';
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=20&addressdetails=1&extratags=1${viewboxParam}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Trippi/1.0 (https://github.com/souranild/trippi)'
      },
      signal
    });
    
    if (!response.ok) throw new Error(`Nominatim search failed: ${response.status}`);
    const data = await response.json();
    
    return data.map((res: any) => ({
      id: res.place_id.toString(),
      name: res.display_name.split(',')[0],
      lat: parseFloat(res.lat),
      lng: parseFloat(res.lon),
      type: res.class || res.type || 'landmark',
      tags: {
        ...res.extratags,
        'addr:full': res.display_name,
        'category': res.class,
        'type': res.type
      }
    }));
  } catch (e) {
    console.warn('Nominatim failed, falling back to Overpass', e);
    return [];
  }
}

/**
 * Fetches hybrid discovery results: nearby utility and national landmarks.
 * @param filter Optional category (e.g. 'food', 'nature', 'museums') or search query
 */
export async function fetchHybridDiscovery(lat: number, lng: number, filter?: string, signal?: AbortSignal, bounds?: { s: number, w: number, n: number, e: number }): Promise<DiscoveryResult[]> {
  const majorCategories = ['famous', 'attractions', 'restaurants', 'cafes', 'parks', 'nature', 'museums', 'sights', 'food'];
  const isSearch = filter && filter.length > 3 && !majorCategories.includes(filter);

  if (isSearch) {
    const searchResults = await fetchNominatimSearch(filter, lat, lng, signal);
    // Enrich top 10 search results in parallel
    const enriched = await Promise.all(searchResults.slice(0, 10).map(r => enrichDiscoveryResult(r)));
    return [...enriched, ...searchResults.slice(10)];
  }

  const isMajorCategory = filter && ['famous', 'attractions', 'sights', 'museums'].includes(filter);
  const cacheKey = `trippi_national_discovery_${Math.floor(lat)}_${Math.floor(lng)}_${filter || 'default'}`;
  
  // Try local storage cache first
  let cached: DiscoveryResult[] = [];
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Date.now() - parsed.timestamp < 1000 * 60 * 60 * 24 * 7) {
          cached = parsed.data;
        }
      }
    }
  } catch (e) {}

  try {
    // Build Area Filter (Bbox or Radius)
    // Reduce radius from 15km to 5km for default "nearby" to speed up queries
    const area = bounds 
      ? `(${bounds.s},${bounds.w},${bounds.n},${bounds.e})`
      : `(around:5000, ${lat}, ${lng})`;

    let qNearby = `nwr["tourism"~"attraction|museum|viewpoint|zoo|theme_park"]${area};`;
    
    if (filter === 'restaurants' || filter === 'food') {
      qNearby = `nwr["amenity"~"restaurant|food_court|fast_food"]${area};`;
    } else if (filter === 'cafes') {
      qNearby = `nwr["amenity"="cafe"]${area};`;
    } else if (filter === 'parks' || filter === 'nature') {
      qNearby = `nwr["leisure"~"park|garden|nature_reserve"]${area};
                 nwr["landuse"="recreation_ground"]${area};`;
    } else if (filter === 'museums') {
      qNearby = `nwr["tourism"="museum"]${area};
                 nwr["historic"~"monument|castle|ruins"]${area};`;
    } else if (filter === 'attractions' || filter === 'sights') {
      qNearby = `nwr["tourism"~"attraction|museum|viewpoint|gallery|theme_park|zoo"]${area};
                 nwr["historic"~"monument|castle|ruins|archaeological_site|fort"]${area};
                 nwr["landmark"="yes"]${area};`;
    } else if (isSearch) {
      // Overpass Search by name
      const searchArea = bounds ? area : `(around:25000, ${lat}, ${lng})`;
      qNearby = `nwr["name"~"${filter}",i]${searchArea};`;
    }
                 
    // Combine primary discovery with fallback/nearby logic
    // Simplified query for faster execution
    const query = `
      [out:json][timeout:10];
      (
        ${qNearby}
        ${!isSearch ? `
          nwr["tourism"~"attraction|museum"](around:1500, ${lat}, ${lng});
          nwr["amenity"~"cafe|restaurant"](around:1500, ${lat}, ${lng});
        ` : ''}
      );
      out center 40;
    `;

    let data = await fetchOverpass(query, signal);

    // Fallback: if no results in tight bbox, try a broader radius
    if ((!data.elements || data.elements.length === 0) && bounds) {
      console.log('Discovery: No results in BBOX, falling back to radius');
      const fallbackRadiusQuery = `
        [out:json][timeout:30];
        (
          ${qNearby.replace(/\([^)]+\)/g, `(around:15000, ${lat}, ${lng})`)}
          ${isMajorCategory ? `nwr["tourism"~"attraction|viewpoint|historic"](around:25000, ${lat}, ${lng});` : ''}
        );
        out center 30;
      `;
      try {
        const fallbackData = await fetchOverpass(fallbackRadiusQuery, signal);
        if (fallbackData.elements && fallbackData.elements.length > 0) {
          data = fallbackData;
        }
      } catch (e) {
        console.warn('Discovery fallback failed', e);
      }
    }

    let results: DiscoveryResult[] = data.elements.map((el: any) => {
      const elLat = el.lat || el.center?.lat;
      const elLng = el.lon || el.center?.lon;
      const elType = el.tags?.tourism || el.tags?.amenity || el.tags?.historic || el.tags?.leisure || 'landmark';
      
      let name = el.tags?.name;
      if (!name) {
        const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
        name = titleCase(elType);
        if (name === 'Landmark') name = 'Historical Site';
        else if (name === 'Tourism') name = 'Local Attraction';
      }
      
      return {
        id: `${el.type}-${el.id}`,
        name: name,
        lat: elLat,
        lng: elLng,
        type: elType,
        tags: el.tags || {},
        distance: (elLat && elLng) ? calculateDistance(lat, lng, elLat, elLng) : 0
      };
    }).filter((r: any) => r.lat !== undefined && r.lng !== undefined && !isNaN(r.lat) && !isNaN(r.lng));

    const finalResults = [...cached, ...results];
    const uniqueResults = Array.from(new Map(finalResults.map(r => [r.id, r])).values());

    // Ranking and Filtering
    uniqueResults.sort((a, b) => {
      const scoreA = (a.significance || 0) * 100 - (a.distance || 0) * 2;
      const scoreB = (b.significance || 0) * 100 - (b.distance || 0) * 2;
      return scoreB - scoreA;
    });

    return uniqueResults.slice(0, 50);
  } catch (error: any) {
    if (error.name === 'AbortError') return [];
    console.error('Discovery Engine Error:', error);
    return [];
  }
}

/**
 * Parses a Google Maps URL to extract location info (coordinates and name)
 * Handles standard URLs, context-heavy URLs and some shortened formats.
 */
export function parseGoogleMapsUrl(url: string): { lat?: number, lng?: number, name?: string, address?: string } | null {
  try {
    const decodedUrl = decodeURIComponent(url);
    
    // 1. Try to find name in /place/Name format
    let name: string | undefined;
    const nameMatch = decodedUrl.match(/\/place\/([^/]+)/);
    if (nameMatch) {
      name = nameMatch[1].replace(/\+/g, ' ').split('/')[0];
    }

    // 2. Try to find coordinates in @lat,lng format (often used as viewport center)
    const atCoordMatch = decodedUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    
    // 3. Try to find precise coordinates in !3dXX!4dYY (Google's internal format for specific entities)
    const precisionMatch = decodedUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    
    if (precisionMatch) {
      return {
        name,
        lat: parseFloat(precisionMatch[1]),
        lng: parseFloat(precisionMatch[2])
      };
    }

    if (atCoordMatch) {
      return {
        name,
        lat: parseFloat(atCoordMatch[1]),
        lng: parseFloat(atCoordMatch[2])
      };
    }

    return name ? { name } : null;
  } catch (e) {
    return null;
  }
}

/**
 * Unified hybrid search for any place/address in the app.
 * Uses Nominatim + Enrichment.
 */
export async function searchLocations(query: string, lat?: number, lng?: number, signal?: AbortSignal): Promise<DiscoveryResult[]> {
  if (!query || query.length < 3) return [];
  
  try {
    const results = await fetchNominatimSearch(query, lat, lng, signal);
    // Enrich top 5 results for speed
    const enriched = await Promise.all(results.slice(0, 5).map(r => enrichDiscoveryResult(r)));
    return [...enriched, ...results.slice(5)];
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return [];
    console.error('Location search failed', e);
    return [];
  }
}

/**
 * Checks if a trip itinerary has logistical issues (long distances, short times)
 */
export function isLogisticallyStrained(places: any[]): boolean {
  if (places.length < 2) return false;
  
  // Sort by day and arrival time
  const sorted = [...places].sort((a,b) => {
    if ((a.day || 0) !== (b.day || 0)) return (a.day || 0) - (b.day || 0);
    return (a.arrival || '00:00').localeCompare(b.arrival || '00:00');
  });

  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i+1];
    
    if (p1.lat && p1.lng && p2.lat && p2.lng) {
      const dist = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
      
      // Heuristic: If distance > 100km and same day, and times are within 2 hours
      if (dist > 100 && (p1.day === p2.day)) {
        if (p1.departure && p2.arrival) {
          const h1 = parseInt(p1.departure.split(':')[0]);
          const h2 = parseInt(p2.arrival.split(':')[0]);
          if (h2 - h1 < 2) return true; // Too fast!
        }
      }
    }
  }
  
  return false;
}

/**
 * Enriches a single discovery result with Wikipedia content
 * Now includes fuzzy search if no direct tag is available.
 */
export async function enrichDiscoveryResult(res: DiscoveryResult): Promise<DiscoveryResult> {
  let wikiTitle = res.tags.wikipedia || res.tags.wikidata;
  
  // High-confidence types that are likely to have Wikipedia pages
  const isHighConfidence = ['museum', 'castle', 'ruins', 'monument', 'park', 'church', 'temple', 'memorial'].includes(res.type);
  const isFoodDrink = ['restaurant', 'cafe', 'bar', 'pub', 'fast_food', 'food_court'].includes(res.type);

  // Fuzzy Fallback: If no direct wiki tag, try searching by name + category
  if (!wikiTitle && res.name && res.name.length > 3) {
    // For food/drink, we are much stricter to avoid showing "Guava Fruit" for "Guava Restaurant"
    const searchQuery = isFoodDrink 
      ? `${res.name} ${res.type} establishment` 
      : `${res.name} ${res.type}`;

    try {
      const searchUrl = `${WIKI_API_ENDPOINT}?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      
      if (searchData.query?.search?.[0]) {
        const topHit = searchData.query.search[0];
        // Only accept if the name is a very close match to the search result title
        // or if it's a high confidence type
        const hitTitle = topHit.title.toLowerCase();
        const nameLower = res.name.toLowerCase();
        
        if (isHighConfidence) {
          wikiTitle = topHit.title;
        } else if (isFoodDrink) {
          // Strict match for food/drink
          if (hitTitle === nameLower || hitTitle.includes(`${nameLower} (`)) {
            wikiTitle = topHit.title;
          }
        } else if (hitTitle.includes(nameLower) || nameLower.includes(hitTitle)) {
          wikiTitle = topHit.title;
        }
      }
    } catch (e) {}
  }

  if (!wikiTitle) return res;
  
  try {
    const title = wikiTitle.includes(':') ? wikiTitle.split(':')[1] : wikiTitle;
    const info = await fetchWikiInfo(title);
    return {
      ...res,
      image: info.image || res.image,
      images: info.images || (res.image ? [res.image] : []),
      description: info.description || res.description,
      significance: info.sitelinks || res.significance
    };
  } catch (e) {
    return res;
  }
}

/**
 * Fetches Wikipedia thumbnail, multiple images, and metadata.
 */
async function fetchWikiInfo(title: string): Promise<{ image?: string; images?: string[]; description?: string; sitelinks: number }> {
  try {
    const url = `${WIKI_API_ENDPOINT}?action=query&prop=pageimages|extracts|langlinks|images&exintro=1&explaintext=1&exchars=400&titles=${encodeURIComponent(title)}&pithumbsize=1000&lllimit=500&imlimit=10&format=json&origin=*`;
    const response = await fetch(url);
    const data = await response.json();
    
    const pages = data.query?.pages || {};
    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];
 
    if (!page || page.missing === "") return { sitelinks: 0 };
 
    // Get more images if available
    const imageFiles = (page.images || [])
      .map((img: any) => img.title)
      .filter((t: string) => t.match(/\.(jpg|jpeg|png|webp)$/i))
      .slice(0, 5);
      
    const imageUrls = await Promise.all(imageFiles.map(async (fileTitle: string) => {
      const imgUrl = `${WIKI_API_ENDPOINT}?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
      const imgRes = await fetch(imgUrl);
      const imgData = await imgRes.json();
      const imgPages = imgData.query?.pages || {};
      const imgPageId = Object.keys(imgPages)[0];
      return imgPages[imgPageId]?.imageinfo?.[0]?.url;
    }));

    const validImages = imageUrls.filter(Boolean);
    const mainImage = page.thumbnail?.source || validImages[0];

    return {
      image: mainImage,
      images: validImages.length > 0 ? validImages : (mainImage ? [mainImage] : []),
      description: page.extract,
      sitelinks: page.langlinks?.length || 0
    };
  } catch (e) {
    return { sitelinks: 0 };
  }
}

/**
 * Haversine Distance Calculation (km)
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Format distance based on user preference
 */
export function formatDistance(km: number | undefined, unit: 'metric' | 'imperial' = 'metric'): string {
  if (km === undefined || isNaN(km)) return '';
  if (unit === 'imperial') {
    const miles = km * 0.621371;
    return `${miles.toFixed(1)} mi`;
  }
  return `${km.toFixed(1)} km`;
}
