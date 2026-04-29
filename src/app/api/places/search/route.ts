import { NextRequest, NextResponse } from 'next/server'
import { fetchGeocoderJson } from '@/lib/geocoder-fetch'
import {
  mapNominatimResults,
  mapPhotonResponse,
  type PhotonSearchResponse,
} from '@/lib/places-search'

export const runtime = 'nodejs'

const NOMINATIM_USER_AGENT = 'Trippi/1.0 (https://github.com/trippi-app; place search)'

const FETCH_MS = 12_000

async function fetchPhoton(q: string, lat?: string, lon?: string): Promise<{ ok: boolean; results: ReturnType<typeof mapPhotonResponse> }> {
  try {
    const url = new URL('https://photon.komoot.io/api/')
    url.searchParams.set('q', q)
    url.searchParams.set('limit', '12')
    if (lat && lon) {
      url.searchParams.set('lat', lat)
      url.searchParams.set('lon', lon)
    }

    const data = (await fetchGeocoderJson(url.toString(), { Accept: 'application/json' }, FETCH_MS)) as PhotonSearchResponse
    return { ok: true, results: mapPhotonResponse(data) }
  } catch {
    return { ok: false, results: [] }
  }
}

async function fetchNominatim(q: string, lat?: string, lon?: string): Promise<{ ok: boolean; results: ReturnType<typeof mapNominatimResults> }> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', q)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '12')
    url.searchParams.set('addressdetails', '1')
    if (lat && lon) {
      url.searchParams.set('lat', lat)
      url.searchParams.set('lon', lon)
    }

    const data = (await fetchGeocoderJson(
      url.toString(),
      {
        Accept: 'application/json',
        'User-Agent': NOMINATIM_USER_AGENT,
      },
      FETCH_MS,
    )) as Parameters<typeof mapNominatimResults>[0]
    return { ok: true, results: mapNominatimResults(data) }
  } catch {
    return { ok: false, results: [] }
  }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  const lat = request.nextUrl.searchParams.get('lat')
  const lon = request.nextUrl.searchParams.get('lon')

  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const photon = await fetchPhoton(q, lat || undefined, lon || undefined)
  if (photon.results.length > 0) {
    return NextResponse.json({ results: photon.results })
  }

  const nominatim = await fetchNominatim(q, lat || undefined, lon || undefined)
  if (nominatim.results.length > 0) {
    return NextResponse.json({ results: nominatim.results })
  }

  if (photon.ok || nominatim.ok) {
    return NextResponse.json({ results: [] })
  }

  return NextResponse.json({
    results: [],
    error:
      'Place search could not load results. Install `curl` on the server, or fix Node TLS (e.g. NODE_EXTRA_CA_CERTS). You can still add places manually.',
  })
}
