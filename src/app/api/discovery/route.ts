import { NextResponse } from 'next/server';
import https from 'https';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter'
];

function fetchOverpassNative(query: string, endpoint: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const postData = `data=${encodeURIComponent(query)}`;
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Trippi/1.0 (https://trippi.app)'
      },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse JSON'));
          }
        } else {
          reject(new Error(`Status ${res.statusCode}: ${data.substring(0, 100)}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Timeout after 30s'));
    });

    req.write(postData);
    req.end();
  });
}

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    let lastError: any = null;
    
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        console.log(`Overpass Proxy: Attempting Native POST ${endpoint}`);
        const data = await fetchOverpassNative(query, endpoint);
        console.log(`Overpass Proxy: Success from ${endpoint}`);
        return NextResponse.json(data);
      } catch (e: any) {
        lastError = e;
        console.warn(`Overpass proxy: failed for ${endpoint}`, e.message || e);
      }
    }

    return NextResponse.json({ error: 'All Overpass mirrors failed', details: lastError?.message }, { status: 502 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
