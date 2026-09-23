/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

type VercelConfig = { headers: { source: string; headers: { key: string; value: string }[] }[] }

/**
 * The security headers production sends (vercel.json), also sent by `vite preview`, so the
 * built app can be tested under the same Content-Security-Policy. The dev server doesn't use
 * them: its hot-reload scripts would be blocked.
 */
const vercel = JSON.parse(
  readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'),
) as VercelConfig
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

const securityHeaders = Object.fromEntries(
  vercel.headers.find((rule) => rule.source === '/(.*)')!.headers.map((h) => [h.key, h.value]),
)

// https://vite.dev/config/
export default defineConfig({
  preview: { headers: securityHeaders },
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    tailwindcss(),
    // Works offline: the service worker keeps a copy of the whole app, including the PDF engine
    // and fonts, so invoices can be made with no connection. There is deliberately no web app
    // manifest: Paperless is a website, not an installable app (a phone app may come later).
    VitePWA({
      // New versions wait for the user to reload (see UpdatePrompt), so a form is never
      // swapped out mid-edit.
      registerType: 'prompt',
      injectRegister: false,
      manifest: false,
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
