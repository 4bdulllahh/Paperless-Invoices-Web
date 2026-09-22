import { describe, expect, it } from 'vitest'
import { calculateTotals, type TotalsInput } from './calc'
import { createSampleInvoice } from './sample'
import type { LineItem } from './schema'

let nextId = 0
function item(overrides: Partial<LineItem> = {}): LineItem {
  return {
    id: `item-${nextId++}`,
    description: '',
    quantity: '1',
    unitPrice: '0',
    taxRate: '',
    discount: { type: 'none', value: '' },
    ...overrides,
  }
}

function totals(items: LineItem[], overrides: Partial<TotalsInput> = {}) {
  return calculateTotals({
    currency: 'USD',
    taxMode: 'exclusive',
    items,
    discount: { type: 'none', value: '' },
    amountPaid: '',
    ...overrides,
  })
}

describe('calculateTotals', () => {
  it('returns zeros for an empty invoice', () => {
    expect(totals([])).toMatchObject({
      digits: 2,
      lines: [],
      subtotal: 0,
      invoiceDiscount: 0,
      taxes: [],
      taxTotal: 0,
      total: 0,
      amountPaid: 0,
      balanceDue: 0,
    })
  })

  describe('line amounts', () => {
    it('rounds quantity × price half up to the cent', () => {
      // 1.5 × 19.99 = 29.985 → 29.99
      expect(totals([item({ quantity: '1.5', unitPrice: '19.99' })]).subtotal).toBe(2999)
    })

    it('is exact where floating point is not', () => {
      // In floats, 1.005 * 100 is 100.49999999999999 and Math.round gives 100.
      expect(totals([item({ unitPrice: '1.005' })]).subtotal).toBe(101)
      // 0.5 × 0.01 = 0.005 → 0.01
      expect(totals([item({ quantity: '0.5', unitPrice: '0.01' })]).subtotal).toBe(1)
      // 0.1 + 0.2 style sums stay exact
      expect(totals([item({ unitPrice: '0.1' }), item({ unitPrice: '0.2' })]).subtotal).toBe(30)
    })

    it('handles large invoices without overflow', () => {
      // 1,000,000 × 99,999.9999 = 99,999,999,900.00
      const result = totals([item({ quantity: '1000000', unitPrice: '99999.9999' })])
      expect(result.subtotal).toBe(9_999_999_990_000)
    })

    it('treats invalid or half-typed numbers as zero', () => {
      const result = totals([
        item({ quantity: 'abc', unitPrice: '10' }),
        item({ quantity: '2', unitPrice: '1.23456' }), // too many decimals
        item({ quantity: '2', unitPrice: '5.' }), // half-typed, still valid
      ])
      expect(result.lines.map((l) => l.gross)).toEqual([0, 0, 1000])
    })
  })

  describe('currencies', () => {
    it('uses whole units for zero-decimal currencies (JPY)', () => {
      const result = totals([item({ quantity: '3', unitPrice: '1500', taxRate: '10' })], {
        currency: 'JPY',
      })
      expect(result).toMatchObject({ digits: 0, subtotal: 4500, taxTotal: 450, total: 4950 })
    })

    it('rounds fractional prices to whole yen', () => {
      expect(totals([item({ unitPrice: '99.5' })], { currency: 'JPY' }).subtotal).toBe(100)
    })

    it('uses three decimals for KWD', () => {
      // 2 × 12.345 = 24.690; 5% tax = 1.2345 → 1.235
      const result = totals([item({ quantity: '2', unitPrice: '12.345', taxRate: '5' })], {
        currency: 'KWD',
      })
      expect(result).toMatchObject({ digits: 3, subtotal: 24690, taxTotal: 1235, total: 25925 })
    })
  })

  describe('line discounts', () => {
    it('takes a rounded percentage off the line', () => {
      // 10% of 29.99 = 2.999 → 3.00
      const [line] = totals([
        item({ quantity: '1', unitPrice: '29.99', discount: { type: 'percent', value: '10' } }),
      ]).lines
      expect(line).toMatchObject({ gross: 2999, lineDiscount: 300, net: 2699 })
    })

    it('never discounts a line below zero', () => {
      const [fixed] = totals([
        item({ unitPrice: '50', discount: { type: 'fixed', value: '80' } }),
      ]).lines
      expect(fixed).toMatchObject({ gross: 5000, lineDiscount: 5000, net: 0 })

      const [percent] = totals([
        item({ unitPrice: '50', discount: { type: 'percent', value: '150' } }),
      ]).lines
      expect(percent.net).toBe(0)
    })
  })

  describe('invoice discount', () => {
    it('applies before tax and splits across tax rates in proportion', () => {
      const result = totals(
        [item({ unitPrice: '100', taxRate: '20' }), item({ unitPrice: '50', taxRate: '5' })],
        { discount: { type: 'percent', value: '10' } },
      )
      expect(result.invoiceDiscount).toBe(1500)
      expect(result.lines.map((l) => l.invoiceDiscountShare)).toEqual([1000, 500])
      expect(result.taxes).toEqual([
        { taxRatePpm: 200000, base: 9000, tax: 1800 },
        { taxRatePpm: 50000, base: 4500, tax: 225 },
      ])
      expect(result.total).toBe(13500 + 2025)
    })

    it('splits a fixed discount so the shares add up exactly', () => {
      const result = totals(
        [item({ unitPrice: '1' }), item({ unitPrice: '1' }), item({ unitPrice: '1' })],
        {
          discount: { type: 'fixed', value: '1' },
        },
      )
      expect(result.lines.map((l) => l.invoiceDiscountShare)).toEqual([34, 33, 33])
      expect(result.total).toBe(200)
    })

    it('never exceeds the subtotal', () => {
      const result = totals([item({ unitPrice: '3' })], { discount: { type: 'fixed', value: '5' } })
      expect(result).toMatchObject({ invoiceDiscount: 300, total: 0 })
    })

    it('ignores the value when the type is none', () => {
      const result = totals([item({ unitPrice: '10' })], {
        discount: { type: 'none', value: '50' },
      })
      expect(result.invoiceDiscount).toBe(0)
    })
  })

  describe('tax', () => {
    it('rounds once per rate, not once per line', () => {
      // Per line: 0.05 × 10% = 0.005 → 0.01 each, 0.02 total. Per rate: 0.10 × 10% = 0.01.
      const result = totals([
        item({ unitPrice: '0.05', taxRate: '10' }),
        item({ unitPrice: '0.05', taxRate: '10' }),
      ])
      expect(result.taxes).toEqual([{ taxRatePpm: 100000, base: 10, tax: 1 }])
    })

    it('supports fractional rates like 8.875%', () => {
      // 100.00 × 8.875% = 8.875 → 8.88
      expect(totals([item({ unitPrice: '100', taxRate: '8.875' })]).taxTotal).toBe(888)
    })

    it('leaves untaxed lines out of the breakdown but in the total', () => {
      const result = totals([
        item({ unitPrice: '100', taxRate: '20' }),
        item({ unitPrice: '40', taxRate: '' }),
        item({ unitPrice: '10', taxRate: '0' }),
      ])
      expect(result.taxes).toEqual([{ taxRatePpm: 200000, base: 10000, tax: 2000 }])
      expect(result.total).toBe(15000 + 2000)
    })

    describe('tax-inclusive prices', () => {
      it('extracts the tax already inside the price', () => {
        const result = totals([item({ unitPrice: '120', taxRate: '20' })], { taxMode: 'inclusive' })
        expect(result.taxes).toEqual([{ taxRatePpm: 200000, base: 10000, tax: 2000 }])
        expect(result.total).toBe(12000)
      })

      it('applies discounts before extracting tax', () => {
        const result = totals([item({ unitPrice: '120', taxRate: '20' })], {
          taxMode: 'inclusive',
          discount: { type: 'percent', value: '10' },
        })
        expect(result).toMatchObject({ invoiceDiscount: 1200, taxTotal: 1800, total: 10800 })
      })

      it('keeps base + tax equal to the amount after rounding', () => {
        // 10.00 / 1.08875 = 9.1848… → 9.18 base, 0.82 tax
        const result = totals([item({ unitPrice: '10', taxRate: '8.875' })], {
          taxMode: 'inclusive',
        })
        expect(result.taxes).toEqual([{ taxRatePpm: 88750, base: 918, tax: 82 }])
        expect(result.total).toBe(1000)
      })
    })
  })

  describe('payments', () => {
    it('subtracts the amount paid from the balance', () => {
      const result = totals([item({ unitPrice: '100' })], { amountPaid: '40' })
      expect(result).toMatchObject({ total: 10000, amountPaid: 4000, balanceDue: 6000 })
    })

    it('shows overpayment as a negative balance', () => {
      expect(totals([item({ unitPrice: '100' })], { amountPaid: '150' }).balanceDue).toBe(-5000)
    })
  })

  it('matches the documented sample invoice', () => {
    const result = calculateTotals(createSampleInvoice())
    expect(result).toMatchObject({
      subtotal: 433500,
      invoiceDiscount: 43350,
      taxTotal: 34626,
      total: 424776,
      amountPaid: 100000,
      balanceDue: 324776,
    })
  })
})
