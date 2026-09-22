import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createIdbBackend, createMemoryBackend, type StorageBackend } from './backends'
import { clearStorageIssue, latestStorageIssue } from './events'
import { createPersistedStore, flushWrites, runMigrations } from './persisted'

const schema = z.object({ count: z.number().int(), label: z.string() })
type Data = z.infer<typeof schema>
const initial: Data = { count: 0, label: 'start' }

let n = 0
const uniqueName = () => `paperless:test-${n++}`

function makeStore(backend: StorageBackend, name = uniqueName(), extra = {}) {
  return createPersistedStore({ name, version: 1, schema, backend, ...extra }, initial, (set) => ({
    increment: () => set((s) => ({ count: s.count + 1 })),
  }))
}

const stored = (backend: StorageBackend, key: string) =>
  JSON.parse(backend.getItem(key) as string) as { state: unknown; version: number }

afterEach(() => clearStorageIssue())

describe('createPersistedStore', () => {
  it('starts from the initial data when nothing is saved', () => {
    const store = makeStore(createMemoryBackend())
    expect(store.getState()).toMatchObject(initial)
    expect(store.persist.hasHydrated()).toBe(true)
  })

  it('saves only data, with its version', () => {
    const backend = createMemoryBackend()
    const name = uniqueName()
    const store = makeStore(backend, name)
    store.getState().increment()
    expect(stored(backend, name)).toEqual({ state: { count: 1, label: 'start' }, version: 1 })
  })

  it('loads saved data synchronously from a synchronous backend', () => {
    const backend = createMemoryBackend()
    const name = uniqueName()
    backend.setItem(name, JSON.stringify({ state: { count: 5, label: 'saved' }, version: 1 }))
    expect(makeStore(backend, name).getState()).toMatchObject({ count: 5, label: 'saved' })
  })

  it.each([
    ['invalid JSON', '{not json'],
    ['an unexpected format', '"just a string"'],
    ['data that fails validation', JSON.stringify({ state: { count: 'many' }, version: 1 })],
  ])('quarantines %s and starts fresh', (_, raw) => {
    const backend = createMemoryBackend()
    const name = uniqueName()
    backend.setItem(name, raw)

    const store = makeStore(backend, name)

    expect(store.getState()).toMatchObject(initial)
    expect(latestStorageIssue()).toEqual({ kind: 'corrupt', key: name })
    const quarantined = (backend.keys() as string[]).filter((k) =>
      k.startsWith(`${name}:quarantine:`),
    )
    expect(quarantined).toHaveLength(1)
    expect(backend.getItem(quarantined[0])).toContain('reason')
  })

  it('migrates older data forward and saves the result', () => {
    const backend = createMemoryBackend()
    const name = uniqueName()
    // Version 1 stored the label as "title".
    backend.setItem(name, JSON.stringify({ state: { count: 3, title: 'old' }, version: 1 }))

    const store = createPersistedStore(
      {
        name,
        version: 2,
        schema,
        backend,
        migrations: {
          2: (state) => {
            const { title, ...rest } = state as { title: string; count: number }
            return { ...rest, label: title }
          },
        },
      },
      initial,
      () => ({}),
    )

    expect(store.getState()).toMatchObject({ count: 3, label: 'old' })
    expect(stored(backend, name)).toEqual({ state: { count: 3, label: 'old' }, version: 2 })
  })

  it('can remove its saved copy', () => {
    const backend = createMemoryBackend()
    const name = uniqueName()
    const store = makeStore(backend, name)
    store.getState().increment()
    store.persist.clearStorage()
    expect(backend.getItem(name)).toBeNull()
  })

  it('loads asynchronously from IndexedDB', async () => {
    const backend = createIdbBackend('persisted-test', 'kv')
    const name = uniqueName()
    await backend.setItem(name, JSON.stringify({ state: { count: 9, label: 'idb' }, version: 1 }))

    const store = makeStore(backend, name)
    expect(store.persist.hasHydrated()).toBe(false)
    await new Promise<void>((resolve) => store.persist.onFinishHydration(() => resolve()))
    expect(store.getState()).toMatchObject({ count: 9, label: 'idb' })
  })

  it('reloads when another tab saves a change', async () => {
    const backend = createMemoryBackend()
    const name = uniqueName()
    const store = makeStore(backend, name)

    // Simulate another tab: write directly, then announce on the shared channel.
    backend.setItem(name, JSON.stringify({ state: { count: 42, label: 'other tab' }, version: 1 }))
    const otherTab = new BroadcastChannel('paperless-storage')
    otherTab.postMessage({ key: 'paperless:unrelated' })
    otherTab.postMessage({ key: name })

    await expect.poll(() => store.getState().count).toBe(42)
    otherTab.close()
  })
})

describe('flushWrites', () => {
  it('waits for slow saves, including ones started while waiting', async () => {
    const memory = createMemoryBackend()
    const landed: string[] = []
    const slow: StorageBackend = {
      ...memory,
      setItem: (key, value) =>
        new Promise<void>((resolve) =>
          setTimeout(() => {
            memory.setItem(key, value)
            landed.push(value)
            resolve()
          }, 20),
        ),
    }
    const store = makeStore(slow)

    store.getState().increment()
    const flushed = flushWrites().then(() => [...landed])
    store.getState().increment()

    expect(landed).toEqual([])
    expect((await flushed).map((v) => JSON.parse(v).state.count)).toEqual([1, 2])
  })

  it('resolves immediately when nothing is pending', async () => {
    await expect(flushWrites()).resolves.toBeUndefined()
  })
})

describe('runMigrations', () => {
  const migrations = { 2: (s: unknown) => `${s}>2`, 4: (s: unknown) => `${s}>4` }

  it('applies each step in order and skips versions without one', () => {
    expect(runMigrations('v1', 1, 4, migrations)).toBe('v1>2>4')
  })

  it('leaves data from the current or a newer version unchanged', () => {
    expect(runMigrations('v4', 4, 4, migrations)).toBe('v4')
    expect(runMigrations('v5', 5, 4, migrations)).toBe('v5')
    expect(runMigrations('v1', 1, 2)).toBe('v1')
  })
})
