import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  extendDefaultRuntimeCaching: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/(?:[a-z]\.)?basemaps\.cartocdn\.com\/.*$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'map-tiles-carto',
          expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] }
        }
      },
      {
        urlPattern: /^https:\/\/server\.arcgisonline\.com\/.*$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'map-tiles-arcgis',
          expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] }
        }
      },
      {
        urlPattern: /^https:\/\/(?:[a-z]\.)?tile\.openstreetmap\.fr\/.*$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'map-tiles-osm',
          expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] }
        }
      },
      {
        urlPattern: /^https:\/\/(?:[a-z]\.)?tile\.openstreetmap\.org\/.*$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'map-tiles-osm-org',
          expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] }
        }
      },
      {
        urlPattern: /^https:\/\/upload\.wikimedia\.org\/.*$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'wiki-images',
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] }
        }
      },
      {
        urlPattern: /^https:\/\/(?:images\.unsplash\.com|fastly\.picsum\.photos|picsum\.photos)\/.*$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'external-images',
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] }
        }
      }
    ]
  },
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-src 'self' https://maps.google.com https://www.google.com https://*.google.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://*.googleapis.com; connect-src 'self' https://maps.googleapis.com https://*.googleapis.com https://en.wikipedia.org https://nominatim.openstreetmap.org https://overpass-api.de https://*.overpass-api.de https://overpass.kumi.systems; img-src 'self' data: https: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;",
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
