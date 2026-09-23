import { describe, expect, it } from 'vitest'
import {
  createInvoiceDraft,
  createLineItem,
  duplicateInvoice,
  emptyParty,
  followDefaults,
  isPristineDraft,
  sameParty,
} from './draft'
import type { Settings } from './records'
import { emptyPaymentDetails, settingsSchema } from './records'

const emptyPaymentForTest = emptyPaymentDetails()
import { createSampleInvoice } from './sample'
import { invoiceSchema, type Invoice } from './schema'

const settings: Settings = {
  currency: 'GBP',
  locale: 'en-GB',
  taxMode: 'inclusive',
  taxLabel: 'VAT',
  defaultTaxRate: '20',
  paymentTermsDays: 30,
  numberPattern: '{YY}-{###}',
  nextSequence: 7,
  templateId: 'classic',
  country: 'GB',
  documentTitle: 'Tax Invoice',
  taxIdLabel: 'VAT reg. no.',
  amountInWords: true,
  dueMode: 'terms',
  showLineTax: true,
  signInvoices: true,
}

describe('createInvoiceDraft', () => {
  const business = { ...emptyParty(), name: 'Acme Studio', email: 'hello@acme.studio' }
  const draft = createInvoiceDraft({
    id: 'inv',
    lineId: 'line',
    today: '2026-09-23',
    settings,
    business,
  })

  it('fills in the user’s defaults', () => {
    expect(draft).toMatchObject({
      id: 'inv',
      number: '26-007',
      issueDate: '2026-09-23',
      dueDate: '2026-10-23',
      currency: 'GBP',
      locale: 'en-GB',
      // Prices are always entered before tax now, whatever an older setting said.
      taxMode: 'exclusive',
      taxLabel: 'VAT',
      templateId: 'classic',
      from: business,
      to: emptyParty(),
      country: 'GB',
      dueMode: 'terms',
      paymentTermsDays: 30,
      showLineTax: true,
      signed: true,
      payment: null,
      poNumber: '',
      supplyDate: '',
    })
    expect(draft.items).toEqual([createLineItem('line', '20')])
  })

  it('copies the business details rather than sharing them', () => {
    expect(draft.from).not.toBe(business)
  })

  it('produces a valid invoice', () => {
    expect(settingsSchema.safeParse(settings).success).toBe(true)
    expect(invoiceSchema.safeParse(draft).success).toBe(true)
  })
})

describe('createLineItem', () => {
  it('starts with quantity 1 and no tax by default', () => {
    expect(createLineItem('a')).toEqual({
      id: 'a',
      description: '',
      quantity: '1',
      unitPrice: '',
      taxRate: '',
      discount: { type: 'none', value: '' },
      unit: '',
      code: '',
    })
  })
})

describe('sameParty', () => {
  it('compares every field', () => {
    const a = { ...emptyParty(), name: 'Acme' }
    expect(sameParty(a, { ...a })).toBe(true)
    expect(sameParty(a, { ...a, taxId: 'X' })).toBe(false)
  })
})

describe('isPristineDraft', () => {
  const fresh = () =>
    createInvoiceDraft({
      id: 'inv',
      lineId: 'line',
      today: '2026-09-23',
      settings,
      business: { ...emptyParty(), name: 'Acme Studio' },
    })

  it('is true for an untouched draft, even with the sender filled in', () => {
    expect(isPristineDraft(fresh())).toBe(true)
  })

  it.each([
    ['a client name', (i: Invoice) => ({ ...i, to: { ...i.to, name: 'Northwind' } })],
    ['a client email', (i: Invoice) => ({ ...i, to: { ...i.to, email: 'a@b.co' } })],
    ['notes', (i: Invoice) => ({ ...i, notes: 'Thanks' })],
    [
      'an item description',
      (i: Invoice) => ({ ...i, items: [{ ...i.items[0], description: 'Design' }] }),
    ],
    ['an item price', (i: Invoice) => ({ ...i, items: [{ ...i.items[0], unitPrice: '10' }] })],
  ])('is false once it has %s', (_, edit) => {
    expect(isPristineDraft(edit(fresh()))).toBe(false)
  })
})

describe('duplicateInvoice', () => {
  const source = createSampleInvoice()
  const business = { ...emptyParty(), name: 'Acme Studio', address: 'New address' }
  let n = 0
  const copy = duplicateInvoice({
    source,
    id: 'copy',
    newLineId: () => `new-line-${++n}`,
    today: '2026-11-02',
    settings,
    business,
  })

  it('keeps the client, items, notes and terms', () => {
    expect(copy).toMatchObject({
      to: source.to,
      notes: source.notes,
      discount: source.discount,
      currency: source.currency,
      taxMode: source.taxMode,
      templateId: source.templateId,
    })
    expect(copy.items.map((item) => item.description)).toEqual(
      source.items.map((item) => item.description),
    )
  })

  it('starts without the original’s purchase order, supply date or own payment details', () => {
    const special = duplicateInvoice({
      source: {
        ...source,
        poNumber: 'PO-1',
        supplyDate: '2026-09-20',
        payment: { ...emptyPaymentForTest, bankName: 'Other Bank' },
      },
      id: 'copy-2',
      newLineId: () => 'line',
      today: '2026-11-02',
      settings,
      business,
    })
    expect(special).toMatchObject({ poNumber: '', supplyDate: '', payment: null })
  })

  it('takes a new id and number, today’s date, the current sender, and nothing paid', () => {
    expect(copy).toMatchObject({
      id: 'copy',
      number: '26-007',
      issueDate: '2026-11-02',
      // The original was due 14 days after it was issued.
      dueDate: '2026-11-16',
      from: business,
      amountPaid: '',
    })
    expect(copy.items.map((item) => item.id)).toEqual(['new-line-1', 'new-line-2', 'new-line-3'])
    expect(invoiceSchema.parse(copy)).toEqual(copy)
  })

  it('never shares data with the original', () => {
    copy.to.name = 'Changed'
    copy.items[0].discount.value = '50'
    expect(source.to.name).toBe('Northwind Ltd')
    expect(source.items[0].discount.value).toBe('')
  })

  it('never makes a due date before the issue date', () => {
    const odd = { ...source, dueDate: '2026-09-01' }
    const fixed = duplicateInvoice({
      source: odd,
      id: 'x',
      newLineId: () => 'line',
      today: '2026-11-02',
      settings,
      business,
    })
    expect(fixed.dueDate).toBe('2026-11-02')
  })
})

describe('followDefaults', () => {
  const draft = createInvoiceDraft({
    id: 'inv',
    lineId: 'line',
    today: '2026-09-23',
    settings,
    business: emptyParty(),
  })

  it('copies the invoice conventions into new drafts', () => {
    expect(draft).toMatchObject({
      title: 'Tax Invoice',
      taxIdLabel: 'VAT reg. no.',
      amountInWords: true,
    })
  })

  it('moves every field still at the old default to the new one', () => {
    const after = {
      ...settings,
      currency: 'EUR',
      locale: 'en-IE',
      taxMode: 'exclusive' as const,
      taxLabel: 'Sales tax',
      templateId: 'bold' as const,
      documentTitle: 'Invoice',
      taxIdLabel: 'VAT no.',
      amountInWords: false,
      paymentTermsDays: 14,
      numberPattern: 'A-{####}',
      nextSequence: 9,
      defaultTaxRate: '23',
      country: 'IE',
      dueMode: 'date' as const,
      showLineTax: false,
      signInvoices: false,
    }
    expect(followDefaults(draft, settings, after)).toMatchObject({
      currency: 'EUR',
      locale: 'en-IE',
      taxLabel: 'Sales tax',
      country: 'IE',
      dueMode: 'date',
      paymentTermsDays: 14,
      showLineTax: false,
      signed: false,
      templateId: 'bold',
      title: 'Invoice',
      taxIdLabel: 'VAT no.',
      amountInWords: false,
      dueDate: '2026-10-07',
      number: 'A-0009',
      items: [{ taxRate: '23' }],
    })
  })

  it('leaves what was changed on the invoice itself', () => {
    const edited = {
      ...draft,
      currency: 'CHF',
      dueDate: '2026-12-31',
      items: [{ ...draft.items[0], taxRate: '5' }],
    }
    const next = followDefaults(edited, settings, {
      ...settings,
      currency: 'EUR',
      paymentTermsDays: 7,
      defaultTaxRate: '23',
      templateId: 'minimal',
    })
    expect(next).toMatchObject({
      currency: 'CHF',
      dueDate: '2026-12-31',
      items: [{ taxRate: '5' }],
      templateId: 'minimal',
    })
  })

  it('returns the same invoice when nothing applies', () => {
    expect(followDefaults(draft, settings, { ...settings })).toBe(draft)
    const custom = { ...draft, items: [{ ...draft.items[0], taxRate: '5' }] }
    expect(followDefaults(custom, settings, { ...settings, defaultTaxRate: '10' })).toBe(custom)
  })
})
