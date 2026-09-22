import { afterEach, describe, expect, it, vi } from 'vitest'
import { getStorageStatus, requestPersistentStorage } from './persistence'

const original = Object.getOwnPropertyDescriptor(navigator, 'storage')

function mockStorage(storage: Partial<StorageManager> | undefined) {
  Object.defineProperty(navigator, 'storage', { value: storage, configurable: true })
}

afterEach(() => {
  if (original) Object.defineProperty(navigator, 'storage', original)
  else delete (navigator as { storage?: unknown }).storage
})

describe('getStorageStatus', () => {
  it('reports usage and persistence when the browser supports it', async () => {
    mockStorage({
      estimate: vi.fn().mockResolvedValue({ usage: 2048, quota: 1_000_000 }),
      persisted: vi.fn().mockResolvedValue(true),
    })
    expect(await getStorageStatus()).toEqual({ usage: 2048, quota: 1_000_000, persisted: true })
  })

  it('reports unknowns when the browser does not', async () => {
    mockStorage(undefined)
    expect(await getStorageStatus()).toEqual({ usage: null, quota: null, persisted: null })

    mockStorage({
      estimate: vi.fn().mockRejectedValue(new Error('nope')),
      persisted: vi.fn().mockRejectedValue(new Error('nope')),
    })
    expect(await getStorageStatus()).toEqual({ usage: null, quota: null, persisted: null })
  })
})

describe('requestPersistentStorage', () => {
  it('returns what the browser decided', async () => {
    mockStorage({ persist: vi.fn().mockResolvedValue(true) })
    expect(await requestPersistentStorage()).toBe(true)
    mockStorage({ persist: vi.fn().mockResolvedValue(false) })
    expect(await requestPersistentStorage()).toBe(false)
  })

  it('returns false when unsupported or failing', async () => {
    mockStorage(undefined)
    expect(await requestPersistentStorage()).toBe(false)
    mockStorage({ persist: vi.fn().mockRejectedValue(new Error('nope')) })
    expect(await requestPersistentStorage()).toBe(false)
  })
})
