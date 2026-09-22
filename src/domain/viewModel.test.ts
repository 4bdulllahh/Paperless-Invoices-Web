import { describe, expect, it } from 'vitest'
import { createSampleInvoice } from './sample'
import { buildInvoiceViewModel } from './viewModel'

describe('buildInvoiceViewModel', () => {
  it('formats the sample invoice for display', () => {
    const view = buildInvoiceViewModel(createSampleInvoice())

    expect(view).toMatchObject({
      number: 'INV-2026-0042',
      issueDate: 'Sep 23, 2026',
      dueDate: 'Oct 7, 2026',
      balanceDue: '$3,247.76',
      notes: 'Thank you for your business!',
      showTaxColumn: false,
      showDiscountColumn: true,
    })
    expect(view.totals).toEqual([
      { kind: 'subtotal', label: 'Subtotal', value: '$4,335.00' },
      { kind: 'discount', label: 'Discount (10%)', value: '-$433.50' },
      { kind: 'tax', label: 'Sales tax 8.875%', value: '$346.26' },
      { kind: 'total', label: 'Total', value: '$4,247.76' },
      { kind: 'paid', label: 'Amount paid', value: '-$1,000.00' },
      { kind: 'balance', label: 'Balance due', value: '$3,247.76' },
    ])
  })

  it('formats each line', () => {
    const [first, , third] = buildInvoiceViewModel(createSampleInvoice()).lines
    expect(first).toEqual({
      id: 'item-1',
      description: 'Website design',
      quantity: '1',
      unitPrice: '$2,400.00',
      taxRate: '8.875%',
      discount: '',
      amount: '$2,400.00',
    })
    expect(third).toMatchObject({ discount: '10%', amount: '$135.00' })
  })

  it('splits addresses into trimmed, non-empty lines', () => {
    const invoice = createSampleInvoice()
    invoice.to.address = '  400 Market Street \n\n San Francisco '
    expect(buildInvoiceViewModel(invoice).to.addressLines).toEqual([
      '400 Market Street',
      'San Francisco',
    ])
  })

  it('leaves the tax cell empty for untaxed lines', () => {
    const base = createSampleInvoice()
    const view = buildInvoiceViewModel({
      ...base,
      items: [base.items[0], { ...base.items[1], taxRate: '' }],
    })
    expect(view.lines.map((l) => l.taxRate)).toEqual(['8.875%', ''])
    expect(view.showTaxColumn).toBe(true)
  })

  it('lists included tax after the total for tax-inclusive invoices', () => {
    const view = buildInvoiceViewModel(
      createSampleInvoice({
        taxMode: 'inclusive',
        taxLabel: 'VAT',
        currency: 'GBP',
        locale: 'en-GB',
        discount: { type: 'none', value: '' },
        amountPaid: '',
        items: [
          {
            id: 'a',
            description: 'Consulting',
            quantity: '1',
            unitPrice: '120',
            taxRate: '20',
            discount: { type: 'none', value: '' },
          },
        ],
      }),
    )
    expect(view.totals.map((r) => [r.kind, r.label, r.value])).toEqual([
      ['subtotal', 'Subtotal', '£120.00'],
      ['total', 'Total', '£120.00'],
      ['tax', 'Includes VAT 20%', '£20.00'],
      ['balance', 'Balance due', '£120.00'],
    ])
  })

  it('shows a tax column only when rates differ, and labels fixed discounts plainly', () => {
    const base = createSampleInvoice()
    const view = buildInvoiceViewModel({
      ...base,
      taxLabel: '',
      discount: { type: 'fixed', value: '50' },
      items: [
        { ...base.items[0], taxRate: '20' },
        { ...base.items[1], taxRate: '5', discount: { type: 'fixed', value: '25' } },
      ],
    })
    expect(view.showTaxColumn).toBe(true)
    expect(view.lines[1].discount).toBe('$25.00')
    expect(view.totals.find((r) => r.kind === 'discount')?.label).toBe('Discount')
    expect(view.totals.filter((r) => r.kind === 'tax').map((r) => r.label)).toEqual([
      'Tax 20%',
      'Tax 5%',
    ])
  })
})
