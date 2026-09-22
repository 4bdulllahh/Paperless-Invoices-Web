import {
  allocate,
  divRound,
  minBigInt,
  MONEY_SCALE,
  parseDecimalOrZero,
  PPM,
  QUANTITY_SCALE,
  RATE_SCALE,
} from './decimal'
import { currencyDigits } from './money'
import type { Discount, Invoice } from './schema'

/** All amounts are integers in the currency's minor units (cents, pence, yen). */
export type LineTotals = {
  id: string
  /** Quantity × unit price. */
  gross: number
  lineDiscount: number
  /** Gross minus the line's own discount: the amount shown on the line. */
  net: number
  /** This line's share of the invoice-level discount. */
  invoiceDiscountShare: number
  /** What tax is calculated on (tax-inclusive: the amount that contains the tax). */
  taxable: number
  /** Tax rate in parts per million: 20% is 200000. */
  taxRatePpm: number
}

export type TaxBreakdown = {
  taxRatePpm: number
  /** Amount before tax for this rate, after all discounts. */
  base: number
  tax: number
}

export type InvoiceTotals = {
  /** Minor-unit digits of the currency (USD 2, JPY 0). */
  digits: number
  lines: LineTotals[]
  /** Sum of line amounts, after line discounts. */
  subtotal: number
  invoiceDiscount: number
  /** One entry per non-zero tax rate, in order of first use. */
  taxes: TaxBreakdown[]
  taxTotal: number
  total: number
  amountPaid: number
  /** Total minus amount paid. Negative when overpaid. */
  balanceDue: number
}

export type TotalsInput = Pick<
  Invoice,
  'currency' | 'taxMode' | 'items' | 'discount' | 'amountPaid'
>

/**
 * Invoice arithmetic.
 *
 * 1. Line: quantity × unit price, rounded to the currency's minor unit, minus the line discount.
 * 2. Invoice discount: applied to the subtotal before tax and split across lines in proportion
 *    to their amounts, so each tax rate gets the right base.
 * 3. Tax: calculated once per rate on the combined base (not per line), then rounded.
 *    Exclusive mode adds it on top; inclusive mode extracts it from the amount.
 *
 * Rounding is half away from zero at each of those steps. Invalid or half-typed numbers
 * count as zero, so a draft always has totals.
 */
export function calculateTotals(input: TotalsInput): InvoiceTotals {
  const digits = currencyDigits(input.currency)
  const minorFactor = 10n ** BigInt(digits)
  const toMinor = (value: string) =>
    divRound(parseDecimalOrZero(value, MONEY_SCALE) * minorFactor, 10n ** BigInt(MONEY_SCALE))

  const discountOn = (discount: Discount, base: bigint): bigint => {
    if (discount.type === 'percent') {
      const ppm = minBigInt(parseDecimalOrZero(discount.value, RATE_SCALE), PPM)
      return divRound(base * ppm, PPM)
    }
    if (discount.type === 'fixed') return minBigInt(toMinor(discount.value), base)
    return 0n
  }

  const lines = input.items.map((item) => {
    const quantity = parseDecimalOrZero(item.quantity, QUANTITY_SCALE)
    const unitPrice = parseDecimalOrZero(item.unitPrice, MONEY_SCALE)
    const gross = divRound(
      quantity * unitPrice * minorFactor,
      10n ** BigInt(QUANTITY_SCALE + MONEY_SCALE),
    )
    const lineDiscount = discountOn(item.discount, gross)
    return {
      id: item.id,
      gross,
      lineDiscount,
      net: gross - lineDiscount,
      taxRatePpm: parseDecimalOrZero(item.taxRate, RATE_SCALE),
    }
  })

  const subtotal = sum(lines.map((line) => line.net))
  const invoiceDiscount = discountOn(input.discount, subtotal)
  const shares = allocate(
    invoiceDiscount,
    lines.map((line) => line.net),
  )
  const taxable = lines.map((line, i) => line.net - shares[i])

  const baseByRate = new Map<bigint, bigint>()
  lines.forEach((line, i) => {
    if (line.taxRatePpm === 0n) return
    baseByRate.set(line.taxRatePpm, (baseByRate.get(line.taxRatePpm) ?? 0n) + taxable[i])
  })

  const inclusive = input.taxMode === 'inclusive'
  const taxes = [...baseByRate].map(([ppm, amount]) => {
    if (!inclusive) return { ppm, base: amount, tax: divRound(amount * ppm, PPM) }
    const base = divRound(amount * PPM, PPM + ppm)
    return { ppm, base, tax: amount - base }
  })

  const afterDiscount = subtotal - invoiceDiscount
  const taxTotal = sum(taxes.map((t) => t.tax))
  const total = inclusive ? afterDiscount : afterDiscount + taxTotal
  const amountPaid = toMinor(input.amountPaid)

  return {
    digits,
    lines: lines.map((line, i) => ({
      id: line.id,
      gross: Number(line.gross),
      lineDiscount: Number(line.lineDiscount),
      net: Number(line.net),
      invoiceDiscountShare: Number(shares[i]),
      taxable: Number(taxable[i]),
      taxRatePpm: Number(line.taxRatePpm),
    })),
    subtotal: Number(subtotal),
    invoiceDiscount: Number(invoiceDiscount),
    taxes: taxes.map((t) => ({
      taxRatePpm: Number(t.ppm),
      base: Number(t.base),
      tax: Number(t.tax),
    })),
    taxTotal: Number(taxTotal),
    total: Number(total),
    amountPaid: Number(amountPaid),
    balanceDue: Number(total - amountPaid),
  }
}

function sum(values: readonly bigint[]): bigint {
  return values.reduce((acc, v) => acc + v, 0n)
}
