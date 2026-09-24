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
      { kind: 'taxable', label: 'Total before Sales tax', value: '$3,901.50' },
      { kind: 'tax', label: 'Sales tax 8.875%', value: '$346.26' },
      { kind: 'total', label: 'Grand total', value: '$4,247.76' },
      { kind: 'paid', label: 'Advance payments', value: '-$1,000.00' },
      { kind: 'balance', label: 'Balance due', value: '$3,247.76' },
    ])
  })

  it('prints the invoice title, tax number label and total in words', () => {
    const plain = buildInvoiceViewModel(createSampleInvoice())
    expect(plain).toMatchObject({ title: 'Invoice', totalInWords: null })
    expect(plain.from.taxIdLabel).toBe('EIN')

    const tax = buildInvoiceViewModel(
      createSampleInvoice({ title: 'Tax Invoice', taxIdLabel: 'TRN', amountInWords: true }),
    )
    expect(tax).toMatchObject({
      title: 'Tax Invoice',
      totalInWords: 'Four Thousand Two Hundred Forty-Seven US Dollars And Seventy-Six Cents.',
    })
    expect(tax.to.taxIdLabel).toBe('TRN')

    // Blank labels fall back to sensible words rather than printing nothing.
    const blank = buildInvoiceViewModel(createSampleInvoice({ title: '', taxIdLabel: '' }))
    expect(blank.title).toBe('Invoice')
    expect(blank.from.taxIdLabel).toBe('Tax ID')
  })

  it('carries the PDF colour and text colours that stay readable on it', () => {
    expect(buildInvoiceViewModel(createSampleInvoice()).theme.onAccent).toBe('#252422')
    const navy = buildInvoiceViewModel(createSampleInvoice({ accentColor: '#1f3a68' }))
    expect(navy.theme).toMatchObject({ accent: '#1f3a68', onAccent: '#ffffff' })
  })

  it('formats each line', () => {
    const [first, , third] = buildInvoiceViewModel(createSampleInvoice()).lines
    expect(first).toEqual({
      id: 'item-1',
      index: '1',
      description: 'Website design',
      code: '',
      unit: '',
      quantity: '1',
      quantityWithUnit: '1',
      unitPrice: '$2,400.00',
      taxRate: '8.875%',
      discount: '',
      amount: '$2,400.00',
      rate: '2,400.00',
      net: '2,400.00',
      // Its share of the invoice's tax, after its share of the 10% discount.
      taxAmount: '191.70',
      totalWithTax: '2,351.70',
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
            unit: '',
            code: '',
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

  it('prints a UAE tax invoice: facts, units, and tax on every line', () => {
    const base = createSampleInvoice()
    const view = buildInvoiceViewModel(
      createSampleInvoice({
        country: 'AE',
        currency: 'AED',
        locale: 'en-AE',
        taxLabel: 'VAT',
        showLineTax: true,
        poNumber: '260400881',
        supplyDate: '2026-08-30',
        dueMode: 'terms',
        paymentTermsDays: 30,
        signed: true,
        discount: { type: 'none', value: '' },
        amountPaid: '',
        items: [
          { ...base.items[0], quantity: '54', unitPrice: '17', taxRate: '5', unit: 'Pcs' },
          { ...base.items[1], quantity: '68', unitPrice: '37', taxRate: '5' },
        ],
      }),
    )
    expect(view.facts.map((f) => f.label)).toEqual([
      'Invoice date',
      'Date of supply',
      'LPO no.',
      'Payment terms',
    ])
    expect(view.facts[2].value).toBe('260400881')
    expect(view.due).toEqual({ label: 'Payment terms', value: 'Net 30 days' })
    expect(view).toMatchObject({
      lineTax: true,
      signed: true,
      showUnitColumn: true,
      codeLabel: '',
      taxLabel: 'VAT',
    })
    expect(view.lines[0]).toMatchObject({
      quantityWithUnit: '54 Pcs',
      rate: '17.00',
      net: '918.00',
      taxAmount: '45.90',
      totalWithTax: '963.90',
    })
    expect(view.lines[1]).toMatchObject({ quantityWithUnit: '68', totalWithTax: '2,641.80' })
    // Intl puts a no-break space after the currency code.
    expect(view.totals.map((r) => [r.label, r.value.replace(/\s/g, ' ')])).toEqual([
      ['Total before VAT', 'AED 3,434.00'],
      ['VAT 5%', 'AED 171.70'],
      ['Grand total', 'AED 3,605.70'],
      ['Balance due', 'AED 3,605.70'],
    ])
  })

  it('names purchase orders and item codes for the country', () => {
    const base = createSampleInvoice()
    const coded = [{ ...base.items[0], code: '998314' }]
    const us = buildInvoiceViewModel(createSampleInvoice({ poNumber: 'PO-7', items: coded }))
    expect(us.facts.map((f) => f.label)).toEqual(['Invoice date', 'PO no.', 'Due date'])
    expect(us.due).toEqual({ label: 'Due date', value: 'Oct 7, 2026' })
    expect(us.codeLabel).toBe('Code')
    const india = buildInvoiceViewModel(createSampleInvoice({ country: 'IN', items: coded }))
    expect(india.codeLabel).toBe('HSN/SAC')
    expect(buildInvoiceViewModel(createSampleInvoice()).codeLabel).toBe('')
  })

  it('shows a plain subtotal and total when nothing is taxed or discounted', () => {
    const base = createSampleInvoice()
    const view = buildInvoiceViewModel({
      ...base,
      discount: { type: 'none', value: '' },
      amountPaid: '',
      items: [{ ...base.items[0], taxRate: '' }],
    })
    expect(view.totals.map((r) => r.label)).toEqual(['Subtotal', 'Total', 'Balance due'])
  })
})
