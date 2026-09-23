import { describe, expect, it } from 'vitest'
import { complianceIssues, taxIdIssue, taxIdRules } from './compliance'
import { createSampleInvoice } from './sample'
import type { Invoice, LineItem } from './schema'

const vatLine = (overrides: Partial<LineItem> = {}): LineItem => ({
  id: 'a',
  description: 'T-shirts',
  quantity: '54',
  unitPrice: '17',
  taxRate: '5',
  discount: { type: 'none', value: '' },
  unit: 'Pcs',
  code: '',
  ...overrides,
})

/** A UAE tax invoice with everything the FTA asks for. */
const uae = (overrides: Partial<Invoice> = {}): Invoice => {
  const base = createSampleInvoice()
  return createSampleInvoice({
    country: 'AE',
    currency: 'AED',
    locale: 'en-AE',
    title: 'Tax Invoice',
    taxLabel: 'VAT',
    taxIdLabel: 'TRN',
    from: { ...base.from, taxId: '100218874400003' },
    to: { ...base.to, taxId: '100268534300003' },
    items: [vatLine()],
    ...overrides,
  })
}

const messages = (invoice: Invoice) => complianceIssues(invoice).map((i) => i.message)

describe('complianceIssues', () => {
  it('has nothing to say about a complete UAE tax invoice, or a country without rules', () => {
    expect(complianceIssues(uae())).toEqual([])
    expect(complianceIssues(createSampleInvoice({ country: '' }))).toEqual([])
    expect(complianceIssues(createSampleInvoice({ country: 'US' }))).toEqual([])
  })

  it('lists what a UAE tax invoice is missing, in editor order, as warnings', () => {
    const base = uae()
    const issues = complianceIssues(
      uae({
        title: 'Invoice',
        currency: 'USD',
        from: { ...base.from, taxId: '', address: '' },
        to: { ...base.to, taxId: '', address: '' },
      }),
    )
    expect(issues.map((i) => [i.section, i.message])).toEqual([
      ['billTo', 'Add the client’s address.'],
      ['billTo', 'Add the client’s TRN if they’re registered for VAT.'],
      ['invoice', 'Title it “Tax Invoice”, as the law in the United Arab Emirates requires.'],
      [
        'invoice',
        'VAT must be stated in AED. Switch the currency, or add the AED amount and exchange rate to the notes.',
      ],
      ['from', 'Add your TRN. Tax invoices in the United Arab Emirates must show it.'],
      ['from', 'Add your business address.'],
    ])
    expect(issues.every((i) => i.legal)).toBe(true)
  })

  it('names the tax plainly when it has no name', () => {
    const base = uae()
    expect(messages(uae({ taxLabel: '', currency: 'USD', to: { ...base.to, taxId: '' } }))).toEqual(
      [
        'Add the client’s TRN if they’re registered for tax.',
        'Tax must be stated in AED. Switch the currency, or add the AED amount and exchange rate to the notes.',
      ],
    )
  })

  it('always asks for the seller’s TRN in the UAE, even without VAT', () => {
    const base = uae()
    const untaxed = uae({
      items: [vatLine({ taxRate: '' })],
      from: { ...base.from, taxId: '' },
      taxLabel: '',
    })
    expect(messages(untaxed)).toEqual([
      'Add your TRN. Invoices in the United Arab Emirates must show it.',
    ])
  })

  it('catches a TRN typed with its label or the wrong number of digits', () => {
    const base = uae()
    const typed = uae({
      from: { ...base.from, taxId: 'TRN100218874400003' },
      to: { ...base.to, taxId: '1002685' },
    })
    expect(messages(typed)).toEqual([
      'Client: A TRN is 15 digits.',
      'Yours: Enter just the number, without “TRN”.',
    ])
  })

  it('asks Indian GST invoices for item codes, a short number and a signature', () => {
    const base = createSampleInvoice()
    const invoice = createSampleInvoice({
      country: 'IN',
      title: 'Tax Invoice',
      taxLabel: 'GST',
      taxIdLabel: 'GSTIN',
      number: 'INV-2026-27-000042',
      from: { ...base.from, taxId: '27AAPFU0939F1ZV' },
      to: { ...base.to, taxId: '29AAGCB7383J1Z4' },
      items: [vatLine({ taxRate: '18' }), vatLine({ id: 'b', unitPrice: '', code: '' })],
    })
    expect(messages(invoice)).toEqual([
      'Add an HSN/SAC code to each item.',
      'Keep the invoice number to 16 characters or fewer.',
      'Sign the invoice: tax invoices in India need an authorised signature.',
    ])
    const fixed = {
      ...invoice,
      number: 'INV/26-27/0042',
      signed: true,
      items: [vatLine({ taxRate: '18', code: '6109' })],
    }
    expect(messages(fixed)).toEqual([])
  })

  it('asks for the client’s details on larger invoices in Australia and South Africa', () => {
    const base = createSampleInvoice()
    const au = (unitPrice: string) =>
      createSampleInvoice({
        country: 'AU',
        currency: 'AUD',
        title: 'Tax Invoice',
        taxLabel: 'GST',
        from: { ...base.from, taxId: '51824753556' },
        to: { ...base.to, address: '' },
        discount: { type: 'none', value: '' },
        items: [vatLine({ quantity: '1', unitPrice, taxRate: '10' })],
      })
    expect(messages(au('500'))).toEqual([])
    expect(messages(au('1000'))).toEqual(['Add the client’s address.'])

    const za = createSampleInvoice({
      country: 'ZA',
      currency: 'ZAR',
      title: 'Tax Invoice',
      taxLabel: 'VAT',
      taxIdLabel: 'VAT no.',
      from: { ...base.from, taxId: '4123456789' },
      discount: { type: 'none', value: '' },
      items: [vatLine({ quantity: '1', unitPrice: '6000', taxRate: '15' })],
    })
    expect(messages(za)).toEqual(['Add the client’s VAT no. if they’re registered for VAT.'])
  })

  it('asks European sellers for their VAT number only when charging VAT', () => {
    const base = createSampleInvoice()
    const de = (taxRate: string) =>
      createSampleInvoice({
        country: 'DE',
        taxIdLabel: '',
        from: { ...base.from, taxId: '' },
        items: [vatLine({ taxRate })],
      })
    expect(messages(de(''))).toEqual([])
    expect(messages(de('19'))).toEqual([
      'Add your tax number. Tax invoices in Germany must show it.',
    ])
  })
})

describe('taxIdIssue', () => {
  it('accepts numbers in the country’s format, with spaces or dashes', () => {
    expect(taxIdIssue('AE', '100 2188 7440 0003', 'TRN')).toBeUndefined()
    expect(taxIdIssue('GB', 'GB 123 4567 89', 'VAT reg. no.')).toBeUndefined()
    expect(taxIdIssue('AU', '51 824 753 556', 'ABN')).toBeUndefined()
    expect(taxIdIssue('NZ', '123-456-789', 'GST no.')).toBeUndefined()
    expect(taxIdIssue('AE', '', 'TRN')).toBeUndefined()
  })

  it('says what the number should look like', () => {
    expect(taxIdIssue('SA', '300000000000000', 'VAT no.')).toBe(
      'A VAT no. is 15 digits, starting and ending with 3.',
    )
    expect(taxIdIssue('OM', '1100012345', 'VATIN')).toBe('A VATIN is OM followed by 10 digits.')
  })

  it('catches the label typed in front, even where the format varies', () => {
    expect(taxIdIssue('DE', 'VAT DE123456789', 'VAT no.')).toBe(
      'Enter just the number, without “VAT”.',
    )
    expect(taxIdIssue('DE', 'DE123456789', 'VAT no.')).toBeUndefined()
    expect(taxIdIssue('', 'anything', '# no.')).toBeUndefined()
  })
})

describe('taxIdRules', () => {
  it('says when the number is required and how it looks', () => {
    expect(taxIdRules('AE')).toEqual({ required: true, example: '100123456700003', itemCode: '' })
    expect(taxIdRules('IN')).toMatchObject({ required: false, itemCode: 'HSN/SAC' })
    expect(taxIdRules('XX')).toEqual({ required: false, example: '', itemCode: '' })
  })
})
