import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OFFLINE_NOTICE_MS, UpdatePrompt } from './UpdatePrompt'

const sw = vi.hoisted(() => ({
  needRefresh: false,
  offlineReady: false,
  updateServiceWorker: vi.fn(async () => {}),
  options: undefined as
    | undefined
    | { onRegisteredSW?: (url: string, r: unknown) => void; onRegisterError?: (e: Error) => void },
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options: typeof sw.options) => {
    sw.options = options
    return {
      needRefresh: useState(sw.needRefresh),
      offlineReady: useState(sw.offlineReady),
      updateServiceWorker: sw.updateServiceWorker,
    }
  },
}))

beforeEach(() => {
  sw.needRefresh = false
  sw.offlineReady = false
  sw.updateServiceWorker.mockClear()
})

afterEach(() => vi.useRealTimers())

describe('UpdatePrompt', () => {
  it('stays out of the way until there’s news', () => {
    render(<UpdatePrompt />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('offers to reload into a new version, or to wait', async () => {
    sw.needRefresh = true
    render(<UpdatePrompt />)
    expect(screen.getByText('A new version of Paperless is ready.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
    await waitFor(() => expect(sw.updateServiceWorker).toHaveBeenCalledWith(true))

    fireEvent.click(screen.getByRole('button', { name: 'Update later' }))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('mentions once that the app works offline, then goes away', () => {
    vi.useFakeTimers()
    sw.offlineReady = true
    render(<UpdatePrompt />)
    expect(screen.getByText('Paperless now works offline, too.')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(OFFLINE_NOTICE_MS))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('checks for updates while the tab stays open, and reports failures', () => {
    vi.useFakeTimers()
    render(<UpdatePrompt />)
    const update = vi.fn(async () => {})
    sw.options?.onRegisteredSW?.('/sw.js', { update })
    sw.options?.onRegisteredSW?.('/sw.js', undefined)
    vi.advanceTimersByTime(60 * 60 * 1000)
    expect(update).toHaveBeenCalledOnce()

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    sw.options?.onRegisterError?.(new Error('blocked'))
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
