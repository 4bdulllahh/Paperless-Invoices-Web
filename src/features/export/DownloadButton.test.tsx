import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import type { TemplateProps } from '../../templates/layout'
import { clearAllData } from '../../storage/backup'
import { loadSampleData } from '../../storage/onboarding'
import { whenHydrated } from '../../storage/persisted'
import {
  useDraftStore,
  useHistoryStore,
  useLogoStore,
  useProfileStore,
  useSettingsStore,
} from '../../storage/stores'

const { renderInvoicePdf, downloadBlob } = vi.hoisted(() => ({
  renderInvoicePdf: vi.fn(),
  downloadBlob: vi.fn(),
}))
vi.mock('../../services/pdf', () => ({
  renderInvoicePdf,
  renderPreview: vi.fn(async () => []),
  warmUp: vi.fn(),
}))
vi.mock('../../services/download', () => ({ downloadBlob }))

const pdf = new Blob(['%PDF-1.7'], { type: 'application/pdf' })

beforeEach(async () => {
  renderInvoicePdf.mockReset().mockResolvedValue(pdf)
  downloadBlob.mockReset()
  await Promise.all([whenHydrated(useHistoryStore), whenHydrated(useLogoStore)])
  await clearAllData()
  useProfileStore.getState().completeOnboarding()
})

async function clickDownload() {
  const button = screen.getByRole('button', { name: 'Download PDF' })
  await waitFor(() => expect(button).toBeEnabled())
  fireEvent.click(button)
}

describe('Download PDF', () => {
  it('lists what’s missing and takes the user to it, without downloading', async () => {
    useDraftStore.getState().startNewInvoice('2026-09-23')
    render(<App />)

    await clickDownload()

    const dialog = await screen.findByRole('dialog', { name: 'A few things before you download' })
    expect(dialog).toHaveFocus()
    const fixes = within(within(dialog).getByRole('list')).getAllByRole('button')
    expect(fixes.map((b) => b.textContent)).toEqual([
      'Add who the invoice is for.Bill to',
      'Add at least one item with a description and price.Items',
      'Add your business name.From',
    ])
    expect(renderInvoicePdf).not.toHaveBeenCalled()

    // "From" starts folded away: fixing it opens the section and puts the cursor in it.
    const from = document.getElementById('editor-section-from') as HTMLDetailsElement
    expect(from.open).toBe(false)
    fireEvent.click(fixes[2])
    expect(from.open).toBe(true)
    expect(within(from).getByLabelText('Name')).toHaveFocus()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useSettingsStore.getState().nextSequence).toBe(1)
  })

  it('downloads the invoice as previewed, saves it to History and uses up the number', async () => {
    loadSampleData('2026-09-23')
    const invoice = useDraftStore.getState().invoice!
    render(<App />)
    expect(screen.getByText('Draft')).toBeInTheDocument()

    await clickDownload()

    expect(await screen.findByText('Downloaded and saved to History')).toBeInTheDocument()
    const props = renderInvoicePdf.mock.lastCall?.[0] as TemplateProps
    expect(props.view.number).toBe('INV-2026-0042')
    expect(props.payment.link).toBe('https://pay.example.com/acme-studio')
    expect(downloadBlob).toHaveBeenCalledWith(pdf, 'Invoice INV-2026-0042 - Northwind Ltd.pdf')
    expect(screen.getAllByText('Invoice INV-2026-0042 - Northwind Ltd.pdf')).not.toHaveLength(0)

    const [entry] = useHistoryStore.getState().entries
    expect(entry.invoice).toEqual(invoice)
    expect(entry.issuedWith?.payment.link).toBe('https://pay.example.com/acme-studio')
    expect(useSettingsStore.getState().nextSequence).toBe(43)
    expect(screen.getByText('Downloaded')).toBeInTheDocument()
  })

  it('downloads again without using another number, and tracks edits since', async () => {
    loadSampleData('2026-09-23')
    render(<App />)
    await clickDownload()
    await screen.findByText('Downloaded and saved to History')

    act(() => useDraftStore.getState().updateInvoice((inv) => ({ ...inv, notes: 'Updated' })))
    expect(screen.getByText('Edited')).toBeInTheDocument()

    await clickDownload()

    await waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(2))
    expect(useHistoryStore.getState().entries).toHaveLength(1)
    expect(useHistoryStore.getState().entries[0].invoice.notes).toBe('Updated')
    expect(useSettingsStore.getState().nextSequence).toBe(43)
    expect(await screen.findByText('Downloaded')).toBeInTheDocument()
  })

  it('offers a fresh invoice with the next number afterwards', async () => {
    loadSampleData('2026-09-23')
    render(<App />)
    await clickDownload()

    fireEvent.click(await screen.findByRole('button', { name: 'Start a new invoice' }))

    expect(useDraftStore.getState().invoice?.number).toMatch(/^INV-\d{4}-0043$/)
    expect(screen.queryByText('Downloaded and saved to History')).not.toBeInTheDocument()
  })

  it('saves nothing if the PDF can’t be made, and can try again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderInvoicePdf.mockRejectedValueOnce(new Error('worker crashed'))
    loadSampleData('2026-09-23')
    render(<App />)

    await clickDownload()

    expect(await screen.findByRole('alert')).toHaveTextContent('The PDF couldn’t be created')
    expect(downloadBlob).not.toHaveBeenCalled()
    expect(useHistoryStore.getState().entries).toEqual([])
    expect(useSettingsStore.getState().nextSequence).toBe(42)

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(1))
    vi.mocked(console.error).mockRestore()
  })

  it('closes its note with Escape', async () => {
    useDraftStore.getState().startNewInvoice('2026-09-23')
    render(<App />)
    await clickDownload()
    await screen.findByRole('dialog')

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
