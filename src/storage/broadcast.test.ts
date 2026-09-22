import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('broadcast', () => {
  it('delivers changes from other tabs until unsubscribed', async () => {
    const { onRemoteChange } = await import('./broadcast')
    const callback = vi.fn()
    const unsubscribe = onRemoteChange('paperless:settings', callback)
    const otherTab = new BroadcastChannel('paperless-storage')

    otherTab.postMessage({ key: 'paperless:settings' })
    await vi.waitFor(() => expect(callback).toHaveBeenCalledOnce())

    unsubscribe()
    otherTab.postMessage({ key: 'paperless:settings' })
    otherTab.postMessage({ key: 'paperless:settings' })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(callback).toHaveBeenCalledOnce()
    otherTab.close()
  })

  it('ignores messages it doesn’t understand', async () => {
    const { onRemoteChange } = await import('./broadcast')
    const callback = vi.fn()
    onRemoteChange('paperless:settings', callback)
    const otherTab = new BroadcastChannel('paperless-storage')

    otherTab.postMessage('paperless:settings')
    otherTab.postMessage({ key: 42 })
    otherTab.postMessage(null)
    otherTab.postMessage({ key: 'paperless:settings' })

    await vi.waitFor(() => expect(callback).toHaveBeenCalledOnce())
    otherTab.close()
  })

  it('does nothing in browsers without BroadcastChannel', async () => {
    vi.stubGlobal('BroadcastChannel', undefined)
    const { announceChange, onRemoteChange } = await import('./broadcast')
    expect(() => announceChange('paperless:settings')).not.toThrow()
    const unsubscribe = onRemoteChange('paperless:settings', vi.fn())
    expect(() => unsubscribe()).not.toThrow()
  })
})
