/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installable, and works offline: the service worker keeps a copy of the whole app,
    // including the PDF engine and fonts, so invoices can be made with no connection.
    VitePWA({
      // New versions wait for the user to reload (see UpdatePrompt), so a form is never
      // swapped out mid-edit.
      registerType: 'prompt',
      injectRegister: false,
      // The icons are already picked up by globPatterns.
      includeManifestIcons: false,
      manifest: {
        name: 'Paperless — Free Invoice Generator',
        short_name: 'Paperless',
        description:
          'Free, private invoicing that runs entirely in your browser. No account, no server.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#f2eee4',
        background_color: '#fffcf2',
        categories: ['business', 'finance', 'productivity'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff,woff2}'],
        // The PDF engine and pdf.js worker are ~1.3 MB each.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    // The PDF engine (react-pdf, pdf.js) is one large chunk by nature. It is loaded on demand,
    // never with the first page, so its size doesn't affect start-up.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    alias: {
      'virtual:pwa-register/react': fileURLToPath(
        new URL('./src/test/pwaRegister.ts', import.meta.url),
      ),
    },
    css: false,
    coverage: {
      provider: 'v8',
      // The calculation core and storage layer must stay fully tested; UI coverage isn't enforced.
      include: ['src/domain/**/*.ts', 'src/storage/**/*.ts'],
      exclude: ['**/*.test.ts'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
})
