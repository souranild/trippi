import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  try {
    // Wikipedia Action API
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(title)}&format=json&origin=*&redirects=1`;

    // Server-side fetch allows us to set a User-Agent, which Wikipedia requires for reliable access
    const response = await fetch(wikiUrl, {
      headers: {
        'User-Agent': 'TrippiTravelApp/1.0 (https://github.com/trippi; contact@trippi.app)'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Wikipedia API error' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }
    });
  } catch (error) {
    console.error('[Wiki Proxy Error]:', error);
    return NextResponse.json({ error: 'Failed to proxy request to Wikipedia' }, { status: 500 });
  }
}
