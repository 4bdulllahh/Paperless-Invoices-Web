import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAllData } from '../storage/backup'
import { useProfileStore } from '../storage/stores'
import { ErrorBoundary } from './ErrorBoundary'

const { downloadBlob } = vi.hoisted(() => ({ downloadBlob: vi.fn() }))
vi.mock('../services/download', () => ({ downloadBlob }))

function Broken(): never {
  throw new Error('Cannot read properties of undefined')
}

beforeEach(async () => {
  downloadBlob.mockReset()
  await clearAllData()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('ErrorBoundary', () => {
  it('shows the app when nothing is wrong', () => {
    render(
      <ErrorBoundary>
        <p>Workspace</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('Workspace')).toBeInTheDocument()
  })

  it('replaces a crash with a way out, and keeps the data reachable', async () => {
    useProfileStore.getState().updateBusiness({ name: 'Acme Studio' })
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByText('Cannot read properties of undefined')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload Paperless' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Download a backup' }))

    expect(await screen.findByText(/Backup saved/)).toBeInTheDocument()
    const [blob, fileName] = downloadBlob.mock.lastCall as [Blob, string]
    expect(fileName).toMatch(/^paperless-backup-\d{4}-\d{2}-\d{2}\.json$/)
    expect(JSON.parse(await blob.text()).stores.profile.state.business.name).toBe('Acme Studio')
  })

  it('says so if even the backup fails', async () => {
    downloadBlob.mockImplementation(() => {
      throw new Error('blocked')
    })
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Download a backup' }))
    expect(await screen.findByText('The backup couldn’t be created.')).toBeInTheDocument()
  })
})
