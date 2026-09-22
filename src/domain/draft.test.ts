import { describe, expect, it } from 'vitest'
import { createInvoiceDraft, createLineItem, emptyParty } from './draft'
import type { Settings } from './records'
import { settingsSchema } from './records'
import { invoiceSchema } from './schema'

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
