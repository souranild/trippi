/** Normalized place row for trip search UI (from Photon / OSM). */
export interface PlaceSearchHit {
  id: string
  name: string
  location: string
  city: string
  country: string
  type: string
  coordinates: { lat: number; lng: number }
}

interface PhotonGeometry {
  type: string
  coordinates: [number, number]
}

interface PhotonProperties {
  name?: string
  street?: string
  city?: string
  town?: string
  district?: string
  locality?: string
  county?: string
  state?: string
  country?: string
  postcode?: string
  type?: string
  osm_key?: string
  osm_value?: string
}

export interface PhotonFeature {
  geometry: PhotonGeometry
  properties: PhotonProperties
}

export type PhotonSearchResponse = { features?: PhotonFeature[] }

function photonTypeToUiType(p: PhotonProperties): string {
  const v = (p.osm_value || p.type || '').toLowerCase()
  const k = (p.osm_key || '').toLowerCase()
  if (v === 'place_of_worship') return 'temple'
  if (k === 'tourism' || v === 'attraction' || v === 'museum' || v === 'viewpoint') return 'landmark'
  if (k === 'leisure' && v === 'park') return 'park'
  if (k === 'amenity') return 'landmark'
  if (k === 'place' && (v === 'city' || v === 'town' || v === 'village')) return 'district'
  if (k === 'boundary' || v === 'administrative') return 'district'
  return 'place'
}

export function mapPhotonFeature(feature: PhotonFeature, index: number): PlaceSearchHit | null {
  const coords = feature.geometry?.coordinates
  if (!coords || coords.length < 2) return null
  const [lng, lat] = coords
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null
  }

  const p = feature.properties || {}
  const name =
    p.name?.trim() ||
    [p.street, p.city].filter(Boolean).join(', ').trim() ||
    p.city ||
    p.district ||
    'Unnamed place'

  const city =
    p.city?.trim() ||
    p.town?.trim() ||
    p.district ||
    p.locality ||
    p.county ||
    ''

  const country = p.country?.trim() || ''

  const location =
    [city, country].filter(Boolean).join(', ') ||
    [p.state, country].filter(Boolean).join(', ') ||
    `${lat.toFixed(3)}, ${lng.toFixed(3)}`

  const id =
    p.osm_key && p.osm_value
      ? `${p.osm_key}:${p.osm_value}:${lat}:${lng}:${index}`
      : `photon:${lat}:${lng}:${index}`

  return {
    id,
    name,
    location,
    city,
    country,
    type: photonTypeToUiType(p),
    coordinates: { lat, lng },
  }
}

export function mapPhotonResponse(data: PhotonSearchResponse): PlaceSearchHit[] {
  const features = data.features || []
  const out: PlaceSearchHit[] = []
  for (let i = 0; i < features.length; i++) {
    const hit = mapPhotonFeature(features[i], i)
    if (hit) out.push(hit)
  }
  return out
}

/** Nominatim (OSM) search JSON row — https://nominatim.org/release-docs/develop/api/Search/ */
interface NominatimHit {
  place_id: number
  lat: string
  lon: string
  display_name: string
  name?: string
  type?: string
  class?: string
  address?: {
    city?: string
    town?: string
    village?: string
    municipality?: string
    county?: string
    state?: string
    country?: string
    road?: string
    suburb?: string
  }
}

function nominatimTypeToUi(c?: string, t?: string): string {
  const cl = (c || '').toLowerCase()
  const ty = (t || '').toLowerCase()
  if (ty === 'place_of_worship' || cl === 'amenity') return 'temple'
  if (cl === 'tourism') return 'landmark'
  if (cl === 'leisure' && ty === 'park') return 'park'
  if (cl === 'place' && (ty === 'city' || ty === 'town' || ty === 'village')) return 'district'
  if (cl === 'boundary') return 'district'
  return 'place'
}

export function mapNominatimResults(hits: NominatimHit[]): PlaceSearchHit[] {
  const out: PlaceSearchHit[] = []
  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i]
    const lat = Number.parseFloat(hit.lat)
    const lng = Number.parseFloat(hit.lon)
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue

    const addr = hit.address || {}
    const city =
      addr.city?.trim() ||
      addr.town?.trim() ||
      addr.village?.trim() ||
      addr.municipality?.trim() ||
      addr.county?.trim() ||
      addr.suburb?.trim() ||
      ''
    const country = addr.country?.trim() || ''

    const name =
      hit.name?.trim() ||
      hit.display_name?.split(',')[0]?.trim() ||
      'Unnamed place'

    const location =
      [city, country].filter(Boolean).join(', ') ||
      [addr.state, country].filter(Boolean).join(', ') ||
      hit.display_name

    out.push({
      id: `nominatim:${hit.place_id}:${i}`,
      name,
      location,
      city,
      country,
      type: nominatimTypeToUi(hit.class, hit.type),
      coordinates: { lat, lng },
    })
  }
  return out
}
