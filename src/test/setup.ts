import '@testing-library/jest-dom/vitest'
// In-memory IndexedDB for jsdom; must load before any module opens a database.
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  // jsdom has no matchMedia; report a light-mode OS by default.
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  // PDF tests run in a plain Node environment, without a DOM.
  if (typeof document === 'undefined') return
  cleanup()
  localStorage.clear()
  delete document.documentElement.dataset.theme
})
