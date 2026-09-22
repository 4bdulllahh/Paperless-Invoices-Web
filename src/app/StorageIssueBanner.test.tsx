import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { clearStorageIssue, reportStorageIssue } from '../storage/events'
import { StorageIssueBanner } from './StorageIssueBanner'

afterEach(() => clearStorageIssue())

describe('StorageIssueBanner', () => {
  it('stays hidden when storage is fine', () => {
    render(<StorageIssueBanner />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows problems found before it rendered', () => {
    reportStorageIssue({ kind: 'unavailable', key: 'localStorage' })
    render(<StorageIssueBanner />)
    expect(screen.getByRole('alert')).toHaveTextContent('blocking storage')
  })

  it('shows new problems and can be dismissed', () => {
    render(<StorageIssueBanner />)
    act(() => reportStorageIssue({ kind: 'quota', key: 'paperless:history' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Storage for Paperless is full')

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
