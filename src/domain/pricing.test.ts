import { describe, expect, it } from 'vitest'
import { calculateTotals } from './calc'
import { fitToTotal, includeTaxInPrices } from './pricing'
import { createSampleInvoice } from './sample'
import type { Invoice, LineItem } from './schema'

const line = (id: string, quantity: string, unitPrice: string, taxRate = '5'): LineItem => ({
  id,
  description: id,
  quantity,
  unitPrice,
  taxRate,
  discount: { type: 'none', value: '' },
  unit: '',
  code: '',
})

const aed = (items: LineItem[], overrides: Partial<Invoice> = {}): Invoice =>
  createSampleInvoice({
    currency: 'AED',
    locale: 'en-AE',
    showLineTax: true,
    discount: { type: 'none', value: '' },
    amountPaid: '',
    items,
    ...overrides,
  })

const prices = (items: LineItem[]) => items.map((item) => item.unitPrice)

describe('includeTaxInPrices', () => {
  it('lowers the rate so 100 with VAT on top becomes 100 with VAT included', () => {
    const fit = includeTaxInPrices(aed([line('a', '1', '100')]))!
    expect(prices(fit.items)).toEqual(['95.24'])
    expect(fit).toMatchObject({ total: 10000, exact: true })
    const totals = calculateTotals(fit.invoice)
    expect([totals.afterDiscount, totals.taxTotal, totals.total]).toEqual([9524, 476, 10000])
  })

  it('lowers every rate by the same proportion, keeping two decimals', () => {
    const fit = includeTaxInPrices(aed([line('a', '54', '17'), line('b', '68', '37')]))!
    expect(fit.exact).toBe(true)
    expect(calculateTotals(fit.invoice).total).toBe(343400)
    for (const price of prices(fit.items)) expect(price).toMatch(/^\d+\.\d{2}$/)
    // 17 and 37 both come down by about 4.76%, give or take the few fils an exact total needs.
    const [a, b] = prices(fit.items).map(Number)
    expect(Math.abs(a - 17 / 1.05)).toBeLessThan(0.1)
    expect(Math.abs(b - 37 / 1.05)).toBeLessThan(0.1)
  })

  it('converts invoices saved with prices that include tax', () => {
    const fit = includeTaxInPrices(aed([line('a', '1', '105')], { taxMode: 'inclusive' }))!
    expect(fit.invoice.taxMode).toBe('exclusive')
    expect(prices(fit.items)).toEqual(['100.00'])
    expect(calculateTotals(fit.invoice).total).toBe(10500)
  })

  it('does nothing when the invoice charges no tax', () => {
    expect(includeTaxInPrices(aed([line('a', '1', '100', '')]))).toBeNull()
  })
})

describe('fitToTotal', () => {
  it('raises or lowers the rates to reach a round grand total', () => {
    const invoice = aed([line('a', '54', '17'), line('b', '32', '17'), line('c', '68', '37')])
    for (const target of [650000, 600000]) {
      const fit = fitToTotal(invoice, target)!
      expect(fit).toMatchObject({ total: target, exact: true })
      expect(calculateTotals({ ...invoice, items: fit.items }).total).toBe(target)
    }
  })

  it('works with whole-number currencies and invoice discounts', () => {
    const yen = createSampleInvoice({
      currency: 'JPY',
      locale: 'en-US',
      amountPaid: '',
      discount: { type: 'fixed', value: '500' },
      items: [line('a', '3', '1200', '10'), line('b', '1', '800', '10')],
    })
    const fit = fitToTotal(yen, 5000)!
    expect(fit.exact).toBe(true)
    for (const price of prices(fit.items)) expect(price).toMatch(/^\d+$/)
  })

  it('reaches exact totals with large quantities, keeping rates within a few fils of even', () => {
    const invoice = aed([line('a', '54', '17'), line('b', '32', '17'), line('c', '68', '37')])
    const fit = fitToTotal(invoice, 650000)!
    expect(fit.exact).toBe(true)
    const [a, b] = prices(fit.items).map(Number)
    // Both started at 17.00, so they stay within a few fils of each other.
    expect(Math.abs(a - b)).toBeLessThanOrEqual(0.1)
  })

  it('gets as close as it can when no two-decimal prices give the exact total', () => {
    // One line at 5%: 0.10 before VAT is 0.11 with it, and 0.09 stays 0.09.
    const fit = fitToTotal(aed([line('a', '1', '1')]), 10)!
    expect(fit.exact).toBe(false)
    expect(Math.abs(fit.total - 10)).toBe(1)
  })

  it('never makes a price negative', () => {
    const fit = fitToTotal(aed([line('tiny', '1', '0.01'), line('big', '1', '1')]), 10)!
    for (const price of prices(fit.items)) expect(Number(price)).toBeGreaterThanOrEqual(0)
    expect(Math.abs(fit.total - 10)).toBeLessThanOrEqual(1)
  })

  it('can bring the total down to zero', () => {
    const fit = fitToTotal(aed([line('a', '2', '10')]), 0)!
    expect(fit).toMatchObject({ total: 0, exact: true })
    expect(prices(fit.items)).toEqual(['0.00'])
  })

  it('leaves free and zero-quantity lines alone', () => {
    const fit = fitToTotal(
      aed([line('a', '1', '100'), line('free', '1', ''), line('none', '0', '50')]),
      21000,
    )!
    expect(prices(fit.items)).toEqual(['200.00', '', '50'])
  })

  it('handles long invoices', () => {
    const items = Array.from({ length: 45 }, (_, i) => line(`l${i}`, String(i + 1), '17'))
    const fit = fitToTotal(aed(items), 1_000_000)!
    expect(Math.abs(fit.total - 1_000_000)).toBeLessThanOrEqual(1)
  })

  it('refuses when there is nothing to scale or the target is negative', () => {
    expect(fitToTotal(aed([line('a', '1', '')]), 100)).toBeNull()
    expect(fitToTotal(aed([line('a', '1', '10')]), -1)).toBeNull()
    const discounted = aed([line('a', '1', '10')], { discount: { type: 'percent', value: '100' } })
    expect(fitToTotal(discounted, 100)).toBeNull()
  })
})
