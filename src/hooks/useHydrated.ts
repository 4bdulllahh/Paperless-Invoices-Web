import { useSyncExternalStore } from 'react'
import type { PersistedStore } from '../storage/persisted'

/**
 * Whether a saved store has finished loading. localStorage stores are ready immediately;
 * IndexedDB stores (history, clients) take a moment, so show a placeholder until then.
 */
export function useHydrated<T extends object, A extends object>(
  store: PersistedStore<T, A>,
): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const unsubscribeStart = store.persist.onHydrate(onChange)
      const unsubscribeFinish = store.persist.onFinishHydration(onChange)
      return () => {
        unsubscribeStart()
        unsubscribeFinish()
      }
    },
    () => store.persist.hasHydrated(),
  )
}
