import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

const BASE = '/kana/'

export default defineConfig({
  base: BASE,
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'kana — learn hiragana & katakana',
        short_name: 'kana',
        description: 'Learn hiragana and katakana with spaced repetition.',
        lang: 'en',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'any',
        background_color: '#f4efe6',
        theme_color: '#c73e1d',
        categories: ['education'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell, pronunciation, sound effects, fonts and stroke data: everything needed offline.
        globPatterns: [
          '**/*.{js,css,html,svg,woff2}',
          'audio/*.mp3',
          'sfx/*.{mp3,json}',
          'fonts/*.woff2',
          'icons/*.png',
          'photos/credits.json',
        ],
        globIgnores: ['**/node_modules/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: `${BASE}index.html`,
        runtimeCaching: [
          {
            // Photos are large, so only the ones you have seen are kept for offline use.
            urlPattern: ({ url }) => url.pathname.startsWith(`${BASE}photos/`),
            handler: 'CacheFirst',
            options: {
              cacheName: 'kana-photos',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
    }),
  ],
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['tests/unit/setup.ts'],
  },
})
