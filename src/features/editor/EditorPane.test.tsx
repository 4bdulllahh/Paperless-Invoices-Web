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
  it('applies an invoice discount and advance payments', () => {
    renderEditor()
    type(within(item(1)).getByLabelText('Unit price'), '100')
    fireEvent.click(screen.getByRole('radio', { name: 'Percent' }))
    type(screen.getByLabelText('Percent off'), '10')
    type(screen.getByLabelText(/Advance payments/), '40')
    expect(balance()).toHaveTextContent('$50.00')

    fireEvent.click(screen.getByRole('button', { name: /Balance due/ }))
    expect(screen.getByText('Discount (10%)')).toBeInTheDocument()
    expect(screen.getByText('Advance payments', { selector: 'dt' })).toBeInTheDocument()
  })

  it('moves the due date with the issue date, keeping the payment terms', () => {
    renderEditor()
    expect(draft().dueDate).toBe('2026-10-23')
    type(screen.getByLabelText('Issue date'), '2026-10-01')
    expect(draft()).toMatchObject({ issueDate: '2026-10-01', dueDate: '2026-10-31' })

    type(screen.getByLabelText('Issue date'), '')
    expect(draft().issueDate).toBe('2026-10-01')

    type(screen.getByLabelText('Due date'), '2026-09-01')
    expect(screen.getByText('The due date is before the issue date.')).toBeInTheDocument()
  })

  it('prints payment terms instead of a due date when asked', () => {
    renderEditor()
    fireEvent.click(screen.getByRole('radio', { name: 'Payment terms' }))
    expect(draft()).toMatchObject({ dueMode: 'terms', dueDate: '2026-10-23' })
    fireEvent.change(screen.getByLabelText('Payment terms'), { target: { value: '75' } })
    expect(draft()).toMatchObject({ paymentTermsDays: 75, dueDate: '2026-12-07' })
    fireEvent.change(screen.getByLabelText('Payment terms'), { target: { value: '0' } })
    expect(screen.getByRole('option', { name: 'On delivery' })).toBeInTheDocument()
    expect(draft().dueDate).toBe('2026-09-23')

    fireEvent.click(screen.getByRole('radio', { name: 'Due date' }))
    expect(draft().dueMode).toBe('date')
    expect(screen.getByLabelText('Due date')).toHaveValue('2026-09-23')
  })

  it('takes a purchase order, a date of supply and a currency', () => {
    renderEditor()
    type(screen.getByLabelText(/Purchase order \(PO\) number/), 'PO-77')
    type(screen.getByLabelText(/Date of supply/), '2026-09-20')
    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'EUR' } })
    expect(draft()).toMatchObject({ poNumber: 'PO-77', supplyDate: '2026-09-20', currency: 'EUR' })
    type(screen.getByLabelText(/Date of supply/), '')
    expect(draft().supplyDate).toBe('')
  })

  it('calls it an LPO in the Gulf', () => {
    act(() => useDraftStore.getState().updateInvoice((inv) => ({ ...inv, country: 'AE' })))
    renderEditor()
    expect(screen.getByLabelText(/LPO number/)).toBeInTheDocument()
  })

  it('opens the profile from the From section', () => {
    const { onEditProfile } = renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }))
    expect(onEditProfile).toHaveBeenCalledTimes(1)
  })
})

describe('EditorPane: tax included and grand totals', () => {
  function priced(price: string, rate = '5') {
    renderEditor()
    type(within(item(1)).getByLabelText('Unit price'), price)
    type(within(item(1)).getByLabelText('Tax %'), rate)
  }

  it('lowers the rates so the tax fits inside the total, and can undo it', () => {
    priced('100')
    fireEvent.click(screen.getByRole('button', { name: 'Include tax in $100.00' }))
    expect(draft().items[0].unitPrice).toBe('95.24')
    expect(balance()).toHaveTextContent('$100.00')
    expect(screen.getByRole('status')).toHaveTextContent('grand total is $100.00')

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(draft().items[0].unitPrice).toBe('100')
    expect(balance()).toHaveTextContent('$105.00')
  })

  it('fits the rates to a grand total you type', () => {
    priced('100')
    type(screen.getByLabelText(/Grand total you want/), '200')
    fireEvent.click(screen.getByRole('button', { name: 'Fit rates' }))
    expect(draft().items[0].unitPrice).toBe('190.48')
    expect(balance()).toHaveTextContent('$200.00')
    expect(screen.getByRole('status')).toHaveTextContent('Rates raised')

    type(screen.getByLabelText(/Grand total you want/), '0.1')
    fireEvent.keyDown(screen.getByLabelText(/Grand total you want/), { key: 'Enter' })
    expect(screen.getByRole('status')).toHaveTextContent('Rates lowered')
    expect(screen.getByRole('status')).toHaveTextContent('as close as prices with 2 decimals')
  })

  it('needs a tax rate before tax can be included', () => {
    priced('100', '')
    expect(screen.getByRole('button', { name: 'Include tax in $100.00' })).toBeDisabled()
  })

  it('converts an invoice made with tax-inclusive prices', () => {
    act(() => useDraftStore.getState().updateInvoice((inv) => ({ ...inv, taxMode: 'inclusive' })))
    priced('105')
    fireEvent.click(screen.getByRole('button', { name: 'Convert prices' }))
    expect(draft()).toMatchObject({ taxMode: 'exclusive', items: [{ unitPrice: '100.00' }] })
  })

  it('shows the tax and total on each line when asked', () => {
    priced('100')
    fireEvent.click(screen.getByLabelText(/on each line/))
    expect(draft().showLineTax).toBe(true)
    expect(within(item(1)).getByText('$5.00')).toBeInTheDocument()
    expect(within(item(1)).getByText('$105.00')).toBeInTheDocument()
  })
})

describe('EditorPane: payment details', () => {
  it('changes them for this invoice only, and says so', () => {
    useProfileStore.getState().updatePayment({ bankName: 'Default Bank' })
    renderEditor()
    type(screen.getByLabelText(/Bank name/), 'Invoice Bank')
    expect(draft().payment?.bankName).toBe('Invoice Bank')
    expect(useProfileStore.getState().payment.bankName).toBe('Default Bank')
    expect(screen.getByText(/You changed the payment details/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Got it' }))
    expect(screen.queryByText(/You changed the payment details/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Card' }))
    expect(draft().payment?.methods).toEqual(['card'])

    fireEvent.click(screen.getByRole('button', { name: 'Use my defaults' }))
    expect(draft().payment).toBeNull()
    expect(screen.getByLabelText(/Bank name/)).toHaveValue('Default Bank')
  })

  it('can undo from the notice, and new invoices start from the defaults', () => {
    renderEditor()
    type(screen.getByLabelText(/Account number/), '123')
    fireEvent.click(screen.getByRole('button', { name: 'Undo changes' }))
    expect(draft().payment).toBeNull()

    type(screen.getByLabelText(/Account number/), '456')
    act(() => void useDraftStore.getState().startNewInvoice('2026-09-24'))
    expect(draft().payment).toBeNull()
  })

  it('explains why there isn’t a QR code', () => {
    useProfileStore.getState().updatePayment({ qr: 'upi', upiId: 'acme@okhdfcbank' })
    renderEditor()
    expect(screen.getByText(/only added to invoices in Indian rupees/)).toBeInTheDocument()
  })
})

describe('EditorPane: items and signing', () => {
  it('saves a unit for each line', () => {
    renderEditor()
    type(within(item(1)).getByLabelText('Unit'), 'Sets')
    expect(draft().items[0].unit).toBe('Sets')
  })

  it('asks for HSN/SAC codes on Indian invoices', () => {
    act(() => useDraftStore.getState().updateInvoice((inv) => ({ ...inv, country: 'IN' })))
    renderEditor()
    type(within(item(1)).getByLabelText('HSN/SAC'), '998314')
    expect(draft().items[0].code).toBe('998314')
  })

  it('labels tax numbers the way the country does, and checks them', () => {
    act(() =>
      useDraftStore
        .getState()
        .updateInvoice((inv) => ({ ...inv, country: 'AE', taxIdLabel: 'TRN' })),
    )
    renderEditor()
    const [client, yours] = screen.getAllByLabelText(/^TRN/)
    type(client, 'TRN100')
    expect(screen.getByText('Enter just the number, without “TRN”.')).toBeInTheDocument()
    expect(yours).toBeRequired()
    expect(yours).toHaveAttribute('placeholder', '100123456700003')
  })

  it('signs the invoice', () => {
    renderEditor()
    fireEvent.click(screen.getByLabelText('Sign this invoice'))
    expect(draft().signed).toBe(true)
    expect(screen.getByText('Signature')).toBeInTheDocument()
    expect(screen.getByText('Company stamp')).toBeInTheDocument()
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
