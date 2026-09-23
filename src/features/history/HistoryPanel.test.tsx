import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyPaymentDetails } from '../../domain/records'
import { createSampleInvoice } from '../../domain/sample'
import type { Invoice } from '../../domain/schema'
import type { TemplateProps } from '../../templates/layout'
import { clearAllData } from '../../storage/backup'
import { whenHydrated } from '../../storage/persisted'
import {
  useDraftStore,
  useHistoryStore,
  useLogoStore,
  useProfileStore,
  useSettingsStore,
} from '../../storage/stores'
import { HistoryPanel } from './HistoryPanel'

const { renderInvoicePdf, downloadBlob } = vi.hoisted(() => ({
  renderInvoicePdf: vi.fn(),
  downloadBlob: vi.fn(),
}))
vi.mock('../../services/pdf', () => ({ renderInvoicePdf }))
vi.mock('../../services/download', () => ({ downloadBlob }))

const pdf = new Blob(['%PDF-1.7'], { type: 'application/pdf' })
const issuedPayment = { ...emptyPaymentDetails(), instructions: 'Old bank account' }

function issue(overrides: Partial<Invoice>) {
  useHistoryStore
    .getState()
    .recordInvoice(createSampleInvoice(overrides), { payment: issuedPayment, logo: null })
}

beforeEach(async () => {
  // Only the clock is faked, so IndexedDB and timers still run.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 10, 12))
  renderInvoicePdf.mockReset().mockResolvedValue(pdf)
  downloadBlob.mockReset()
  await Promise.all([whenHydrated(useHistoryStore), whenHydrated(useLogoStore)])
  await clearAllData()
  issue({ id: 'a', number: 'INV-2026-0001', dueDate: '2026-10-01' })
  issue({
    id: 'b',
    number: 'INV-2026-0002',
    dueDate: '2026-10-20',
    to: { name: 'Contoso', email: 'ap@contoso.com', phone: '', address: '', taxId: '' },
  })
})

afterEach(() => vi.useRealTimers())

const row = (number: string) => screen.getByText(number).closest('li')!

describe('HistoryPanel', () => {
  it('explains what appears here when nothing has been downloaded', async () => {
    await clearAllData()
    render(<HistoryPanel onOpenDraft={vi.fn()} />)
    expect(screen.getByText('No invoices yet')).toBeInTheDocument()
  })

  it('lists invoices newest first, with client, total and payment status', () => {
    render(<HistoryPanel onOpenDraft={vi.fn()} />)
    const items = screen.getAllByRole('listitem')
    expect(items.map((li) => within(li).getByText(/^INV-/).textContent)).toEqual([
      'INV-2026-0002',
      'INV-2026-0001',
    ])
    const first = row('INV-2026-0001')
    expect(within(first).getByText('Northwind Ltd')).toBeInTheDocument()
    expect(within(first).getByText('$4,247.76')).toBeInTheDocument()
    expect(within(first).getByText('Overdue')).toBeInTheDocument()
    expect(within(row('INV-2026-0002')).getByText('Unpaid')).toBeInTheDocument()
  })

  it('filters by status and searches', () => {
    render(<HistoryPanel onOpenDraft={vi.fn()} />)

    fireEvent.click(screen.getByRole('radio', { name: /Overdue/ }))
    expect(screen.queryByText('INV-2026-0002')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /Paid/ }))
    expect(screen.getByText('No paid invoices.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: /All/ }))
    fireEvent.change(screen.getByLabelText('Search invoices'), { target: { value: 'contoso' } })
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    fireEvent.change(screen.getByLabelText('Search invoices'), { target: { value: 'zzz' } })
    expect(screen.getByText('No invoices match “zzz”.')).toBeInTheDocument()
  })

  it('marks an invoice paid on a chosen date, and unpaid again', () => {
    render(<HistoryPanel onOpenDraft={vi.fn()} />)
    fireEvent.click(within(row('INV-2026-0001')).getByRole('button', { name: 'Mark paid' }))

    const date = screen.getByLabelText('Date paid')
    expect(date).toHaveValue('2026-10-10')
    expect(date).toHaveFocus()
    fireEvent.change(date, { target: { value: '' } }) // half-typed dates are ignored
    fireEvent.change(date, { target: { value: '2026-10-05' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const entry = useHistoryStore.getState().entries.find((e) => e.invoice.id === 'a')
    expect(entry).toMatchObject({ status: 'paid', paidAt: '2026-10-05' })
    expect(within(row('INV-2026-0001')).getByText('Paid')).toBeInTheDocument()
    expect(within(row('INV-2026-0001')).getByText(/Paid Oct 5, 2026/)).toBeInTheDocument()
    expect(within(row('INV-2026-0001')).getByRole('button', { name: 'Mark unpaid' })).toHaveFocus()

    fireEvent.click(within(row('INV-2026-0001')).getByRole('button', { name: 'Mark unpaid' }))
    expect(within(row('INV-2026-0001')).getByText('Overdue')).toBeInTheDocument()
  })

  it('deletes only after confirming', () => {
    render(<HistoryPanel onOpenDraft={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete INV-2026-0001' }))
    // The safe choice is focused, and Escape backs out to the button that asked.
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })
    expect(useHistoryStore.getState().entries).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Delete INV-2026-0001' })).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'Delete INV-2026-0001' }))
    const confirm = screen.getByRole('alertdialog', { name: /Delete INV-2026-0001 from History/ })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }))

    expect(useHistoryStore.getState().entries.map((e) => e.invoice.number)).toEqual([
      'INV-2026-0002',
    ])
    expect(screen.getByRole('heading', { name: 'History' })).toHaveFocus()
  })

  it('cancels marking paid with Escape and returns focus', () => {
    render(<HistoryPanel onOpenDraft={vi.fn()} />)
    fireEvent.click(within(row('INV-2026-0001')).getByRole('button', { name: 'Mark paid' }))
    fireEvent.keyDown(screen.getByLabelText('Date paid'), { key: 'Escape' })
    expect(screen.queryByLabelText('Date paid')).not.toBeInTheDocument()
    expect(within(row('INV-2026-0001')).getByRole('button', { name: 'Mark paid' })).toHaveFocus()
  })

  it('downloads an invoice again exactly as issued, without saving or numbering', async () => {
    useProfileStore.getState().updatePayment({ instructions: 'New bank account' })
    render(<HistoryPanel onOpenDraft={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download INV-2026-0001 again' }))

    await waitFor(() =>
      expect(downloadBlob).toHaveBeenCalledWith(pdf, 'Invoice INV-2026-0001 - Northwind Ltd.pdf'),
    )
    const props = renderInvoicePdf.mock.lastCall?.[0] as TemplateProps
    expect(props.payment.instructions).toBe('Old bank account')
    expect(useHistoryStore.getState().entries).toHaveLength(2)
    expect(useSettingsStore.getState().nextSequence).toBe(1)
  })

  it('says so if a download fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderInvoicePdf.mockRejectedValueOnce(new Error('worker crashed'))
    render(<HistoryPanel onOpenDraft={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download INV-2026-0001 again' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The PDF couldn’t be created')
    vi.mocked(console.error).mockRestore()
  })

  it('duplicates into a new draft straight away when nothing would be lost', () => {
    useSettingsStore.getState().updateSettings({ nextSequence: 3 })
    useDraftStore.getState().startNewInvoice('2026-10-10')
    const onOpenDraft = vi.fn()
    render(<HistoryPanel onOpenDraft={onOpenDraft} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Duplicate INV-2026-0002 as a new invoice' }),
    )

    expect(onOpenDraft).toHaveBeenCalled()
    expect(useDraftStore.getState().invoice).toMatchObject({
      number: 'INV-2026-0003',
      issueDate: '2026-10-10',
      to: { name: 'Contoso' },
    })
  })

  it('asks before replacing a draft with unsaved work', () => {
    useDraftStore.getState().startNewInvoice('2026-10-10')
    useDraftStore.getState().updateInvoice((inv) => ({ ...inv, notes: 'Work in progress' }))
    const onOpenDraft = vi.fn()
    render(<HistoryPanel onOpenDraft={onOpenDraft} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Duplicate INV-2026-0002 as a new invoice' }),
    )
    expect(onOpenDraft).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }))

    expect(onOpenDraft).toHaveBeenCalled()
    expect(useDraftStore.getState().invoice?.to.name).toBe('Contoso')
  })
})
