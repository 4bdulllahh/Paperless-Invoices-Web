/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The PDF engine (react-pdf, pdf.js) is one large chunk by nature. It is loaded on demand,
    // never with the first page, so its size doesn't affect start-up.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
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
