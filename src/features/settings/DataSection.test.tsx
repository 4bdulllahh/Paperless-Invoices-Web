import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAllData, createBackup } from '../../storage/backup'
import { useProfileStore } from '../../storage/stores'
import { DataSection } from './DataSection'

const { downloadBlob } = vi.hoisted(() => ({ downloadBlob: vi.fn() }))
vi.mock('../../services/download', () => ({ downloadBlob }))

beforeEach(async () => {
  downloadBlob.mockClear()
  await clearAllData()
})

async function chooseFile(contents: string) {
  const input = screen.getByTestId('backup-file-input')
  const file = new File([contents], 'backup.json', { type: 'application/json' })
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

describe('DataSection', () => {
  it('exports a backup file', async () => {
    useProfileStore.getState().updateBusiness({ name: 'Acme Studio' })
    render(<DataSection />)

    fireEvent.click(screen.getByRole('button', { name: 'Export backup' }))

    await waitFor(() => expect(downloadBlob).toHaveBeenCalledOnce())
    const [blob, fileName] = downloadBlob.mock.calls[0] as [Blob, string]
    expect(fileName).toMatch(/^paperless-backup-\d{4}-\d{2}-\d{2}\.json$/)
    expect(JSON.parse(await blob.text()).stores.profile.state.business.name).toBe('Acme Studio')
    expect(screen.getByRole('status')).toHaveTextContent(`Backup saved as ${fileName}`)
  })

  it('asks before replacing data with an imported backup', async () => {
    useProfileStore.getState().updateBusiness({ name: 'From backup' })
    const file = JSON.stringify(await createBackup())
    await clearAllData()
    render(<DataSection />)

    await chooseFile(file)
    expect(useProfileStore.getState().business.name).toBe('')

    fireEvent.click(screen.getByRole('button', { name: 'Replace data' }))
    expect(useProfileStore.getState().business.name).toBe('From backup')
    expect(await screen.findByText(/Restored the backup from/)).toBeInTheDocument()
  })

  it('can cancel an import', async () => {
    useProfileStore.getState().updateBusiness({ name: 'From backup' })
    const file = JSON.stringify(await createBackup())
    await clearAllData()
    render(<DataSection />)

    await chooseFile(file)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('button', { name: 'Replace data' })).not.toBeInTheDocument()
    expect(useProfileStore.getState().business.name).toBe('')
  })

  it('explains why a file can’t be imported', async () => {
    render(<DataSection />)
    await chooseFile('not a backup')
    expect(screen.getByRole('status')).toHaveTextContent('isn’t valid JSON')
    expect(screen.queryByRole('button', { name: 'Replace data' })).not.toBeInTheDocument()
  })

  it('deletes all data only after confirmation', async () => {
    useProfileStore.getState().updateBusiness({ name: 'Acme Studio' })
    render(<DataSection />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete all data' }))
    expect(useProfileStore.getState().business.name).toBe('Acme Studio')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete all data' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete everything' }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('All Paperless data was deleted'),
    )
    expect(useProfileStore.getState().business.name).toBe('')
  })

  it('offers to protect data from automatic clearing', async () => {
    const persist = vi.fn().mockResolvedValue(true)
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        estimate: vi.fn().mockResolvedValue({ usage: 1536, quota: 1e9 }),
        persisted: vi.fn().mockResolvedValue(false),
        persist,
      },
    })
    render(<DataSection />)

    expect(await screen.findByText('1.5 kB')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Protect' }))

    await waitFor(() => expect(persist).toHaveBeenCalled())
    expect(await screen.findByRole('status')).toHaveTextContent('no longer clear')
    delete (navigator as { storage?: unknown }).storage
  })
})
