import { createStore, del, get, keys, set, type UseStore } from 'idb-keyval'
import { reportStorageIssue } from './events'

type MaybePromise<T> = T | Promise<T>

/** Raw string storage. Never throws: failures are reported and treated as "nothing stored". */
export type StorageBackend = {
  kind: 'local' | 'idb' | 'memory'
  getItem(key: string): MaybePromise<string | null>
  setItem(key: string, value: string): MaybePromise<void>
  removeItem(key: string): MaybePromise<void>
  keys(): MaybePromise<string[]>
}

export const STORAGE_PREFIX = 'paperless:'

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  )
}

function report(error: unknown, key: string) {
  reportStorageIssue({ kind: isQuotaError(error) ? 'quota' : 'unavailable', key })
}

/** Keeps data for this tab only. Used when the browser blocks real storage. */
export function createMemoryBackend(): StorageBackend {
  const data = new Map<string, string>()
  return {
    kind: 'memory',
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
    keys: () => [...data.keys()],
  }
}

/**
 * localStorage: synchronous, so small data (profile, settings, draft) is ready on first render.
 * About 5 MB per site.
 */
export function createLocalBackend(
  getStorage: () => Storage = () => window.localStorage,
): StorageBackend {
  let storage: Storage
  try {
    storage = getStorage()
  } catch (error) {
    report(error, 'localStorage')
    return createMemoryBackend()
  }
  return {
    kind: 'local',
    getItem(key) {
      try {
        return storage.getItem(key)
      } catch (error) {
        report(error, key)
        return null
      }
    },
    setItem(key, value) {
      try {
        storage.setItem(key, value)
      } catch (error) {
        report(error, key)
      }
    },
    removeItem(key) {
      try {
        storage.removeItem(key)
      } catch (error) {
        report(error, key)
      }
    },
    keys() {
      try {
        return Object.keys(storage)
      } catch (error) {
        report(error, 'localStorage')
        return []
      }
    },
  }
}

/** IndexedDB: asynchronous, far larger quota. Used for data that grows (history, clients). */
export function createIdbBackend(dbName = 'paperless', storeName = 'kv'): StorageBackend {
  let store: UseStore
  try {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB is not available')
    store = createStore(dbName, storeName)
  } catch (error) {
    report(error, 'indexedDB')
    return createMemoryBackend()
  }
  return {
    kind: 'idb',
    async getItem(key) {
      try {
        return (await get<string>(key, store)) ?? null
      } catch (error) {
        report(error, key)
        return null
      }
    },
    async setItem(key, value) {
      try {
        await set(key, value, store)
      } catch (error) {
        report(error, key)
      }
    },
    async removeItem(key) {
      try {
        await del(key, store)
      } catch (error) {
        report(error, key)
      }
    },
    async keys() {
      try {
        return (await keys(store)).map(String)
      } catch (error) {
        report(error, 'indexedDB')
        return []
      }
    },
  }
}

export const localBackend = createLocalBackend()
export const idbBackend = createIdbBackend()
