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
  /** This line's tax. With tax per line it's the line's own; otherwise its share of its rate's. */
  tax: number
  /** What the line comes to with tax: taxable plus tax (tax-inclusive: taxable itself). */
  totalWithTax: number
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
  /** Subtotal minus the invoice discount: the total before tax (tax-inclusive: with tax). */
  afterDiscount: number
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
  'currency' | 'taxMode' | 'items' | 'discount' | 'amountPaid' | 'showLineTax'
>

/**
 * Invoice arithmetic.
 *
 * 1. Line: quantity × unit price, rounded to the currency's minor unit, minus the line discount.
 * 2. Invoice discount: applied to the subtotal before tax and split across lines in proportion
 *    to their amounts, so each tax rate gets the right base.
 * 3. Tax: calculated once per rate on the combined base, then rounded. Invoices that print tax
 *    on every line (showLineTax) round each line's tax instead and add those up, so the printed
 *    lines match the totals. Exclusive mode adds tax on top; inclusive mode extracts it.
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

  const inclusive = input.taxMode === 'inclusive'
  /** Tax on an amount: [base before tax, tax]. */
  const taxOn = (amount: bigint, ppm: bigint): [bigint, bigint] => {
    if (!inclusive) return [amount, divRound(amount * ppm, PPM)]
    const base = divRound(amount * PPM, PPM + ppm)
    return [base, amount - base]
  }

  const lineTax: bigint[] = lines.map(() => 0n)
  const byRate = new Map<bigint, number[]>()
  lines.forEach((line, i) => {
    if (line.taxRatePpm === 0n) return
    byRate.set(line.taxRatePpm, [...(byRate.get(line.taxRatePpm) ?? []), i])
  })
  const taxes = [...byRate].map(([ppm, indexes]) => {
    if (input.showLineTax) {
      let base = 0n
      for (const i of indexes) {
        const [lineBase, tax] = taxOn(taxable[i], ppm)
        base += lineBase
        lineTax[i] = tax
      }
      return { ppm, base, tax: sum(indexes.map((i) => lineTax[i])) }
    }
    const [base, tax] = taxOn(sum(indexes.map((i) => taxable[i])), ppm)
    allocate(
      tax,
      indexes.map((i) => taxable[i]),
    ).forEach((share, k) => (lineTax[indexes[k]] = share))
    return { ppm, base, tax }
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
      tax: Number(lineTax[i]),
      totalWithTax: Number(inclusive ? taxable[i] : taxable[i] + lineTax[i]),
    })),
    subtotal: Number(subtotal),
    invoiceDiscount: Number(invoiceDiscount),
    afterDiscount: Number(afterDiscount),
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
