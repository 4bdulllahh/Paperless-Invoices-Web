import type { z } from 'zod'
import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware'
import type { StorageBackend } from './backends'
import { announceChange, onRemoteChange } from './broadcast'
import { reportStorageIssue } from './events'

/** Upgrades stored data one version at a time: migrations[2] turns version 1 data into version 2. */
export type Migrations = Record<number, (state: unknown) => unknown>

export type StoreDefinition<T> = {
  /** Storage key, e.g. "paperless:settings". */
  name: string
  /** Bump when the stored shape changes, and add a migration. */
  version: number
  schema: z.ZodType<T>
  backend: StorageBackend
  migrations?: Migrations
}

/** Updates saved data. Actions only see data (not other actions), which lets TypeScript infer their types. */
type Setter<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => void

export type PersistedStore<T extends object, A extends object> = UseBoundStore<StoreApi<T & A>> & {
  persist: {
    rehydrate: () => Promise<void> | void
    hasHydrated: () => boolean
    onHydrate: (listener: (state: T & A) => void) => () => void
    onFinishHydration: (listener: (state: T & A) => void) => () => void
    clearStorage: () => void
  }
  definition: StoreDefinition<T>
  /** The data (without actions) a brand-new user starts with. */
  initialData: T
}

export function runMigrations(
  state: unknown,
  fromVersion: number,
  toVersion: number,
  migrations: Migrations = {},
): unknown {
  let current = state
  for (let version = fromVersion + 1; version <= toVersion; version++) {
    const step = migrations[version]
    if (step) current = step(current)
  }
  return current
}

/** Keep unreadable data under a side key instead of deleting it, so it can still be recovered. */
export function quarantine(backend: StorageBackend, name: string, data: unknown, reason: string) {
  const key = `${name}:quarantine:${Date.now()}`
  void backend.setItem(key, JSON.stringify({ reason, data }))
  reportStorageIssue({ kind: 'corrupt', key: name })
}

function then<T, R>(value: T | Promise<T>, fn: (value: T) => R): R | Promise<R> {
  return value instanceof Promise ? value.then(fn) : fn(value)
}

/** IndexedDB writes still in flight. A reload or tab close before they land would lose them. */
const pendingWrites = new Set<Promise<unknown>>()

function track<T>(value: T | Promise<T>): T | Promise<T> {
  if (value instanceof Promise) {
    pendingWrites.add(value)
    const done = () => pendingWrites.delete(value)
    value.then(done, done)
  }
  return value
}

/**
 * Resolves once every save started so far has reached storage. Await it before telling the
 * user something was saved, e.g. after restoring a backup.
 */
export async function flushWrites(): Promise<void> {
  while (pendingWrites.size > 0) await Promise.all(pendingWrites)
}

function isStorageValue(value: unknown): value is StorageValue<unknown> {
  return typeof value === 'object' && value !== null && 'state' in value && 'version' in value
}

/**
 * JSON over a raw backend. Stays synchronous for synchronous backends, so localStorage stores
 * hydrate before the first render.
 */
function createPersistStorage<T>(backend: StorageBackend): PersistStorage<T> {
  return {
    getItem: (name) =>
      then(backend.getItem(name), (raw) => {
        if (raw === null) return null
        let parsed: unknown
        try {
          parsed = JSON.parse(raw)
        } catch {
          quarantine(backend, name, raw, 'invalid JSON')
          return null
        }
        if (!isStorageValue(parsed)) {
          quarantine(backend, name, parsed, 'unexpected format')
          return null
        }
        return parsed as StorageValue<T>
      }),
    setItem: (name, value) =>
      then(track(backend.setItem(name, JSON.stringify(value))), () => announceChange(name)),
    removeItem: (name) => then(track(backend.removeItem(name)), () => announceChange(name)),
  }
}

/**
 * A Zustand store saved to browser storage. Stored data is migrated to the current version and
 * validated before use; anything invalid is quarantined and the store starts from `initialData`.
 */
export function createPersistedStore<T extends object, A extends object>(
  definition: StoreDefinition<T>,
  initialData: T,
  actions: (set: Setter<T>, get: () => T) => A,
): PersistedStore<T, A> {
  const dataKeys = Object.keys(initialData) as (keyof T)[]

  const store = create<T & A>()(
    persist((set, get) => ({ ...initialData, ...actions(set as Setter<T>, get) }), {
      name: definition.name,
      version: definition.version,
      storage: createPersistStorage<T>(definition.backend),
      partialize: (state) => Object.fromEntries(dataKeys.map((key) => [key, state[key]])) as T,
      migrate: (persisted, fromVersion) =>
        runMigrations(persisted, fromVersion, definition.version, definition.migrations) as T,
      merge: (persisted, current) => {
        if (persisted === undefined) return current
        const result = definition.schema.safeParse(persisted)
        if (result.success) return { ...current, ...result.data }
        quarantine(definition.backend, definition.name, persisted, 'failed validation')
        return current
      },
    }),
  )

  onRemoteChange(definition.name, () => void store.persist.rehydrate())

  return Object.assign(store, { definition, initialData }) as PersistedStore<T, A>
}
