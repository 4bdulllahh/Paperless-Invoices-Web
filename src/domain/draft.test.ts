import { describe, expect, it } from 'vitest'
import {
  createInvoiceDraft,
  createLineItem,
  duplicateInvoice,
  emptyParty,
  isPristineDraft,
  sameParty,
} from './draft'
import type { Settings } from './records'
import { settingsSchema } from './records'
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
      taxMode: 'inclusive',
      taxLabel: 'VAT',
      templateId: 'classic',
      from: business,
      to: emptyParty(),
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
