import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAllData } from '../../storage/backup'
import {
  useClientsStore,
  useDraftStore,
  useProfileStore,
  useSettingsStore,
} from '../../storage/stores'
import { EditorPane } from './EditorPane'

const draft = () => useDraftStore.getState().invoice!
const item = (n: number) => screen.getByRole('group', { name: `Item ${n}` })
const type = (element: HTMLElement, value: string) =>
  fireEvent.change(element, { target: { value } })
const balance = () => screen.getByRole('button', { name: /Balance due/ }).nextElementSibling!

beforeEach(async () => {
  await clearAllData()
  useSettingsStore
    .getState()
    .updateSettings({ currency: 'USD', locale: 'en-US', defaultTaxRate: '' })
  useDraftStore.getState().startNewInvoice('2026-09-23')
})

function renderEditor() {
  const onEditProfile = vi.fn()
  render(<EditorPane onEditProfile={onEditProfile} />)
  return { onEditProfile }
}

describe('EditorPane: line items', () => {
  it('calculates line amounts and the balance as you type', () => {
    renderEditor()
    type(within(item(1)).getByLabelText('Description'), 'Design')
    type(within(item(1)).getByLabelText('Qty'), '2')
    type(within(item(1)).getByLabelText('Unit price'), '49.99')

    expect(within(item(1)).getByText('$99.98')).toBeInTheDocument()
    expect(balance()).toHaveTextContent('$99.98')
    expect(draft().items[0]).toMatchObject({
      description: 'Design',
      quantity: '2',
      unitPrice: '49.99',
    })
  })

  it('accepts a decimal comma and shows how the number was read', () => {
    act(() => useDraftStore.getState().updateInvoice((inv) => ({ ...inv, locale: 'de-DE' })))
    renderEditor()
    const price = within(item(1)).getByLabelText('Unit price')
    type(price, '12,50')
    expect(draft().items[0].unitPrice).toBe('12.50')
    fireEvent.blur(price)
    expect(price).toHaveValue('12,50')
  })

  it('never saves an invalid number', () => {
    renderEditor()
    const qty = within(item(1)).getByLabelText('Qty')
    type(qty, 'two')
    expect(qty).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Enter a quantity, e.g. 1 or 2.5')).toBeInTheDocument()
    expect(draft().items[0].quantity).toBe('1')
  })

  it('adds, duplicates, moves and deletes items', () => {
    renderEditor()
    type(within(item(1)).getByLabelText('Description'), 'First')

    fireEvent.click(screen.getByRole('button', { name: 'Add item' }))
    expect(within(item(2)).getByLabelText('Description')).toHaveFocus()
    type(within(item(2)).getByLabelText('Description'), 'Second')

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Item 1' }))
    expect(draft().items.map((i) => i.description)).toEqual(['First', 'First', 'Second'])

    fireEvent.click(screen.getByRole('button', { name: 'Move Item 3 up' }))
    expect(draft().items.map((i) => i.description)).toEqual(['First', 'Second', 'First'])
    expect(screen.getByRole('button', { name: 'Move Item 1 up' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Item 1' }))
    expect(draft().items.map((i) => i.description)).toEqual(['Second', 'First'])
    expect(screen.getByRole('button', { name: 'Add item' })).toHaveFocus()
  })

  it('adds a new item when Enter is pressed on the last one', () => {
    renderEditor()
    fireEvent.keyDown(within(item(1)).getByLabelText('Unit price'), { key: 'Enter' })
    expect(draft().items).toHaveLength(2)
    expect(within(item(2)).getByLabelText('Description')).toHaveFocus()
    // Enter on an earlier item doesn't add another.
    fireEvent.keyDown(within(item(1)).getByLabelText('Qty'), { key: 'Enter' })
    expect(draft().items).toHaveLength(2)
  })

  it('applies a line discount', () => {
    renderEditor()
    type(within(item(1)).getByLabelText('Unit price'), '200')
    fireEvent.click(within(item(1)).getByRole('button', { name: 'Add discount' }))
    type(within(item(1)).getByLabelText('Percent off'), '10')
    expect(within(item(1)).getByText('$180.00')).toBeInTheDocument()

    fireEvent.click(within(item(1)).getByRole('radio', { name: 'Amount' }))
    type(within(item(1)).getByLabelText('Amount off'), '5')
    expect(within(item(1)).getByText('$195.00')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove Item 1 discount' }))
    expect(draft().items[0].discount).toEqual({ type: 'none', value: '' })
  })

  it('shows an empty state when every item is removed', () => {
    renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Delete Item 1' }))
    expect(screen.getByText(/No items yet/)).toBeInTheDocument()
  })
})

describe('EditorPane: bill to', () => {
  beforeEach(() => {
    useClientsStore.getState().saveClient({
      name: 'Northwind Ltd',
      email: 'accounts@northwind.com',
      phone: '',
      address: '400 Market Street',
      taxId: '',
    })
  })

  it('suggests saved clients and fills in their details from the keyboard', () => {
    renderEditor()
    const name = screen.getByRole('combobox', { name: 'Client name' })
    fireEvent.focus(name)
    type(name, 'north')
    expect(name).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(name, { key: 'ArrowDown' })
    expect(name).toHaveAttribute('aria-activedescendant')
    fireEvent.keyDown(name, { key: 'Enter' })

    expect(draft().to).toMatchObject({ name: 'Northwind Ltd', address: '400 Market Street' })
    expect(screen.getByText('Saved in your clients')).toBeInTheDocument()
  })

  it('picks a client by clicking, and closes with Escape', () => {
    renderEditor()
    const name = screen.getByRole('combobox', { name: 'Client name' })
    fireEvent.focus(name)
    fireEvent.keyDown(name, { key: 'Escape' })
    expect(name).toHaveAttribute('aria-expanded', 'false')

    type(name, 'N')
    fireEvent.click(screen.getByRole('option', { name: /Northwind Ltd/ }))
    expect(draft().to.email).toBe('accounts@northwind.com')
  })

  it('saves a new client and updates a changed one', () => {
    renderEditor()
    type(screen.getByRole('combobox', { name: 'Client name' }), 'Contoso')
    fireEvent.click(screen.getByRole('button', { name: 'Save to clients' }))
    expect(useClientsStore.getState().clients.map((c) => c.name)).toContain('Contoso')

    type(screen.getAllByLabelText(/Email/)[0], 'billing@contoso.com')
    fireEvent.click(screen.getByRole('button', { name: 'Update saved client' }))
    const contoso = useClientsStore.getState().clients.find((c) => c.name === 'Contoso')
    expect(contoso?.email).toBe('billing@contoso.com')
  })
})

describe('EditorPane: invoice settings', () => {
  it('applies an invoice discount and amount already paid', () => {
    renderEditor()
    type(within(item(1)).getByLabelText('Unit price'), '100')
    fireEvent.click(screen.getByRole('radio', { name: 'Percent' }))
    type(screen.getByLabelText('Percent off'), '10')
    type(screen.getByLabelText(/Already paid/), '40')
    expect(balance()).toHaveTextContent('$50.00')

    fireEvent.click(screen.getByRole('button', { name: /Balance due/ }))
    expect(screen.getByText('Discount (10%)')).toBeInTheDocument()
    expect(screen.getByText('Amount paid')).toBeInTheDocument()
  })

  it('moves the due date with the issue date, keeping the payment terms', () => {
    renderEditor()
    expect(draft().dueDate).toBe('2026-10-07')
    type(screen.getByLabelText('Issue date'), '2026-10-01')
    expect(draft()).toMatchObject({ issueDate: '2026-10-01', dueDate: '2026-10-15' })

    type(screen.getByLabelText('Issue date'), '')
    expect(draft().issueDate).toBe('2026-10-01')

    type(screen.getByLabelText('Due date'), '2026-09-01')
    expect(screen.getByText('The due date is before the issue date.')).toBeInTheDocument()
  })

  it('switches tax mode and currency', () => {
    renderEditor()
    fireEvent.click(screen.getByRole('radio', { name: 'Tax included' }))
    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'EUR' } })
    expect(draft()).toMatchObject({ taxMode: 'inclusive', currency: 'EUR' })
  })

  it('opens the profile from the From and Payment sections', () => {
    const { onEditProfile } = renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add payment details' }))
    expect(onEditProfile).toHaveBeenCalledTimes(2)
  })
})

describe('EditorPane: payment QR code', () => {
  const qrSummary = () => screen.getByText('QR code').nextElementSibling!

  it('says what the QR code on this invoice does', () => {
    useProfileStore.getState().updateBusiness({ name: 'Acme Studio' })
    useProfileStore.getState().updatePayment({ link: 'https://pay.example.com/acme' })
    useDraftStore.getState().startNewInvoice('2026-09-23')
    renderEditor()
    type(within(item(1)).getByLabelText('Unit price'), '100')
    expect(qrSummary()).toHaveTextContent('Scan to pay onlineOpens pay.example.com')
    expect(screen.getByRole('button', { name: 'Edit payment details' })).toBeInTheDocument()
  })

  it('explains why there isn’t one', () => {
    useProfileStore.getState().updatePayment({ qr: 'upi', upiId: 'acme@okhdfcbank' })
    renderEditor()
    expect(qrSummary()).toHaveTextContent(/only added to invoices in Indian rupees/)
    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'INR' } })
    expect(qrSummary()).toHaveTextContent(/Add your business name/)
  })
})

describe('EditorPane: new invoice', () => {
  it('starts straight away when nothing has been entered', () => {
    renderEditor()
    const before = draft().id
    fireEvent.click(screen.getByRole('button', { name: 'New invoice' }))
    expect(draft().id).not.toBe(before)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('asks first when there is work in progress', () => {
    renderEditor()
    type(screen.getByLabelText(/Notes to client/), 'Keep me')
    const before = draft().id

    fireEvent.click(screen.getByRole('button', { name: 'New invoice' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(draft().notes).toBe('Keep me')

    fireEvent.click(screen.getByRole('button', { name: 'New invoice' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start new invoice' }))
    expect(draft().id).not.toBe(before)
    expect(draft().notes).toBe('')
  })

  it('offers to start one when there is no draft', () => {
    act(() => useDraftStore.getState().clearDraft())
    renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Start an invoice' }))
    expect(useDraftStore.getState().invoice).not.toBeNull()
  })
})
