import { afterEach, describe, expect, it, vi } from 'vitest'
import { createIdbBackend, createLocalBackend, createMemoryBackend } from './backends'
import { clearStorageIssue, latestStorageIssue } from './events'

afterEach(() => {
  clearStorageIssue()
  vi.restoreAllMocks()
})

const quotaError = () => new DOMException('full', 'QuotaExceededError')

describe('createLocalBackend', () => {
  it('reads, writes, lists and removes keys', () => {
    const backend = createLocalBackend()
    backend.setItem('paperless:a', '1')
    backend.setItem('paperless:b', '2')
    expect(backend.getItem('paperless:a')).toBe('1')
    expect(backend.keys()).toEqual(expect.arrayContaining(['paperless:a', 'paperless:b']))
    backend.removeItem('paperless:a')
    expect(backend.getItem('paperless:a')).toBeNull()
  })

  it('falls back to memory when the browser blocks storage', () => {
    const backend = createLocalBackend(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(backend.kind).toBe('memory')
    expect(latestStorageIssue()).toEqual({ kind: 'unavailable', key: 'localStorage' })
    backend.setItem('k', 'v')
    expect(backend.getItem('k')).toBe('v')
  })

  it('reports a full storage instead of throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quotaError()
    })
    const backend = createLocalBackend()
    expect(() => backend.setItem('paperless:big', 'x')).not.toThrow()
    expect(latestStorageIssue()).toEqual({ kind: 'quota', key: 'paperless:big' })
  })

  it('treats read, remove and list failures as empty', () => {
    const broken = {
      getItem: () => {
        throw new Error('boom')
      },
      removeItem: () => {
        throw new Error('boom')
      },
    } as unknown as Storage
    const backend = createLocalBackend(
      () =>
        new Proxy(broken, {
          ownKeys: () => {
            throw new Error('boom')
          },
        }),
    )
    expect(backend.getItem('paperless:x')).toBeNull()
    expect(() => backend.removeItem('paperless:x')).not.toThrow()
    expect(backend.keys()).toEqual([])
    expect(latestStorageIssue()?.kind).toBe('unavailable')
  })
})

describe('createMemoryBackend', () => {
  it('keeps data for the session only', () => {
    const backend = createMemoryBackend()
    backend.setItem('a', '1')
    expect(backend.keys()).toEqual(['a'])
    backend.removeItem('a')
    expect(backend.getItem('a')).toBeNull()
  })
})

describe('createIdbBackend', () => {
  it('reads, writes, lists and removes keys', async () => {
    const backend = createIdbBackend('test-db', 'kv')
    expect(backend.kind).toBe('idb')
    await backend.setItem('paperless:x', 'hello')
    expect(await backend.getItem('paperless:x')).toBe('hello')
    expect(await backend.getItem('paperless:missing')).toBeNull()
    expect(await backend.keys()).toEqual(['paperless:x'])
    await backend.removeItem('paperless:x')
    expect(await backend.keys()).toEqual([])
  })

  it('falls back to memory when IndexedDB is missing', () => {
    vi.stubGlobal('indexedDB', undefined)
    const backend = createIdbBackend('test-db-2')
    expect(backend.kind).toBe('memory')
    expect(latestStorageIssue()).toEqual({ kind: 'unavailable', key: 'indexedDB' })
  })

  it('reports failures without throwing', async () => {
    const backend = createIdbBackend('test-db-3')
    await backend.setItem('warmup', '1')
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw quotaError()
    })
    vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(IDBObjectStore.prototype, 'delete').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(IDBObjectStore.prototype, 'getAllKeys').mockImplementation(() => {
      throw new Error('boom')
    })

    await backend.setItem('paperless:big', 'x')
    expect(latestStorageIssue()).toEqual({ kind: 'quota', key: 'paperless:big' })
    expect(await backend.getItem('paperless:a')).toBeNull()
    await expect(backend.removeItem('paperless:a')).resolves.toBeUndefined()
    expect(await backend.keys()).toEqual([])
  })
})
