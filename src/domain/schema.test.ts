import { describe, expect, it } from 'vitest'
import { createSampleInvoice } from './sample'
import { discountSchema, invoiceSchema, lineItemSchema } from './schema'

const sampleItem = () => createSampleInvoice().items[0]

describe('invoiceSchema', () => {
  it('accepts the sample invoice', () => {
    expect(invoiceSchema.safeParse(createSampleInvoice()).success).toBe(true)
  })

  it('rejects a malformed currency or date', () => {
    expect(invoiceSchema.safeParse(createSampleInvoice({ currency: 'usd' })).success).toBe(false)
    expect(invoiceSchema.safeParse(createSampleInvoice({ issueDate: '2026-13-01' })).success).toBe(
      false,
    )
  })

  it('fills in fields added in 1.1 for invoices saved before', () => {
    const { title: _t, taxIdLabel: _l, amountInWords: _w, ...older } = createSampleInvoice()
    expect(invoiceSchema.parse(older)).toMatchObject({
      title: 'Invoice',
      taxIdLabel: 'Tax ID',
      amountInWords: false,
    })
  })

  it('fills in fields added in 1.2 for invoices saved before', () => {
    const {
      country: _c,
      poNumber: _p,
      supplyDate: _s,
      dueMode: _d,
      paymentTermsDays: _t,
      payment: _pay,
      signed: _sig,
      showLineTax: _l,
      ...older
    } = createSampleInvoice()
    const parsed = invoiceSchema.parse({
      ...older,
      items: older.items.map(({ unit: _u, code: _code, ...item }) => item),
    })
    expect(parsed).toMatchObject({
      country: '',
      poNumber: '',
      supplyDate: '',
      dueMode: 'date',
      paymentTermsDays: 30,
      payment: null,
      signed: false,
      showLineTax: false,
    })
    expect(parsed.items[0]).toMatchObject({ unit: '', code: '' })
  })

  it('takes a supply date or none, but not a malformed one', () => {
    const ok = (supplyDate: string) =>
      invoiceSchema.safeParse(createSampleInvoice({ supplyDate })).success
    expect([ok(''), ok('2026-08-30'), ok('30/08/2026')]).toEqual([true, true, false])
  })

  it('rejects unknown templates', () => {
    const invoice = { ...createSampleInvoice(), templateId: 'fancy' }
    expect(invoiceSchema.safeParse(invoice).success).toBe(false)
  })
})

describe('lineItemSchema', () => {
  it('accepts empty and half-typed numbers in drafts', () => {
    const result = lineItemSchema.safeParse({ ...sampleItem(), quantity: '', unitPrice: '5.' })
    expect(result.success).toBe(true)
  })

  it('explains what a valid number looks like', () => {
    const result = lineItemSchema.safeParse({ ...sampleItem(), quantity: 'two' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]).toMatchObject({
      path: ['quantity'],
      message: 'Enter a quantity, e.g. 1 or 2.5',
    })
  })

  it('limits decimal places', () => {
    expect(lineItemSchema.safeParse({ ...sampleItem(), unitPrice: '1.12345' }).success).toBe(false)
    expect(lineItemSchema.safeParse({ ...sampleItem(), unitPrice: '1.1234' }).success).toBe(true)
  })
})

describe('discountSchema', () => {
  it('ignores the value when there is no discount', () => {
    expect(discountSchema.safeParse({ type: 'none', value: 'anything' }).success).toBe(true)
  })

  it('validates percentages and caps them at 100', () => {
    expect(discountSchema.safeParse({ type: 'percent', value: '12.5' }).success).toBe(true)
    const over = discountSchema.safeParse({ type: 'percent', value: '101' })
    expect(over.error?.issues[0]).toMatchObject({
      path: ['value'],
      message: 'A discount can’t exceed 100%',
    })
  })

  it('validates fixed amounts', () => {
    expect(discountSchema.safeParse({ type: 'fixed', value: '25.50' }).success).toBe(true)
    const bad = discountSchema.safeParse({ type: 'fixed', value: '$25' })
    expect(bad.error?.issues[0]).toMatchObject({
      path: ['value'],
      message: 'Enter an amount, e.g. 49.99',
    })
  })
})
