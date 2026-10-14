import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { env } from 'node:process'
import seoBuildPlugin from './scripts/build-seo.mjs'

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.APP_BUILD_ID': JSON.stringify(env.VERCEL_GIT_COMMIT_SHA || new Date().toISOString()),
  },
  plugins: [
    react(),
    tailwindcss(),
    seoBuildPlugin(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'favicon-v2.png', 'apple-touch-icon-v2.png', 'masked-icon.svg'],
      manifest: {
        id: '/',
        name: 'UJELADEA',
        short_name: 'UJELADEA',
        description: 'UJELADEA, juventud Los Amigos del Distrito El Alto, dependiente de UJELAB',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        // Relative URL checks this origin without changing either installed app's identity.
        related_applications: [{ platform: 'webapp', url: '/manifest.webmanifest' }],
        icons: [
          {
            src: 'pwa-192x192-v2.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-maskable-192x192-v2.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'pwa-512x512-v2.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-maskable-512x512-v2.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        skipWaiting: false,
        clientsClaim: true,
        navigateFallback: '/app.html',
        navigateFallbackDenylist: [/^\/(?:sitemap(?:-paginas|-publicaciones)?\.xml|robots\.txt)(?:\?|$)/],
        globIgnores: ['**/seo-template.html', '**/seo-pages/**', '**/images/community/**'],
        globPatterns: ['**/*.{js,css,html,ico,png,webp,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/images/community/') && url.pathname.endsWith('.webp'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'community-photos-v1',
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          },
          {
            urlPattern: /\/data\/.*\.json$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hymnal-data-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 90
              }
            }
          }
        ]
      }
    })
  ],
})
