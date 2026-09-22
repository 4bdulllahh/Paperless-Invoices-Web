import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadBlob } from './download'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('downloadBlob', () => {
  it('clicks a temporary link to the file, then frees it', () => {
    vi.useFakeTimers()
    const createObjectURL = vi.fn(() => 'blob:paperless/1')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('backup.json')
      expect(this.href).toBe('blob:paperless/1')
      expect(this.isConnected).toBe(true)
    })

    downloadBlob(new Blob(['{}']), 'backup.json')

    expect(click).toHaveBeenCalledOnce()
    expect(document.querySelector('a')).toBeNull()
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:paperless/1')
  })
})
