import { useState } from 'react'

/**
 * Test stand-in for vite-plugin-pwa's `virtual:pwa-register/react`, which only exists in real
 * builds (jsdom has no service workers). Tests that need other states mock this module.
 */
export function useRegisterSW() {
  return {
    needRefresh: useState(false),
    offlineReady: useState(false),
    updateServiceWorker: async () => {},
  }
}
