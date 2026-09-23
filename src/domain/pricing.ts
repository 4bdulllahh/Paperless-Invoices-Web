import { calculateTotals } from './calc'
import {
  divRound,
  MONEY_SCALE,
  parseDecimalOrZero,
  QUANTITY_SCALE,
  toDecimalString,
} from './decimal'
import type { Invoice, LineItem } from './schema'

/**
 * Working back from a grand total: "make it 100 with tax included", or "make it a round 6,500".
 * Every unit price is raised or lowered by the same proportion, kept to the currency's decimals
 * (2 for AED), and then nudged by the smallest unit until the total matches. With large
 * quantities one fil on a rate moves the total by many, so a few rates may end up a few fils
 * apart from the exact proportion; sometimes no two-decimal rates give the total at all, and the
 * closest is returned.
 */

export type PriceFit = {
  items: LineItem[]
  /** The grand total the new prices give, in minor units. */
  total: number
  /** False when no prices at the currency's decimals give the exact total asked for. */
  exact: boolean
}

/** Rounds of proportional scaling before nudging; fixed discounts make scaling slightly off. */
const SCALING_ROUNDS = 4
/** Upper bound on nudges, so a pathological invoice can't hang the page. */
const MAX_NUDGES = 200
/** Trying pairs of lines grows with the square of the count, so only for shorter invoices. */
const MAX_LINES_FOR_PAIRS = 40
/**
 * The last step for an exact total: every combination of small changes (up to this many minor
 * units) on the lines with the smallest quantities, whose steps are finest.
 */
const EXACT_SEARCH_LINES = 3
const EXACT_SEARCH_RANGE = 8
/** With one or two lines to vary, a wider search costs about as much. */
const EXACT_SEARCH_RANGE_FEW = 30

/** Every combination of `count` steps between -r and r where at least one is ±r. */
function shell(count: number, r: number): number[][] {
  if (count === 0) return [[]]
  return shell(count - 1, r).flatMap((rest) =>
    Array.from({ length: 2 * r + 1 }, (_, k) => [k - r, ...rest]),
  )
}

/**
 * New prices that bring the grand total to `target` (in minor units), or as close as the
 * currency's decimals allow. Null when there's nothing to scale: no priced lines, or a total of
 * zero.
 */
export function fitToTotal(invoice: Invoice, target: number): PriceFit | null {
  const { digits, total: startTotal } = calculateTotals(invoice)
  const perMinor = 10n ** BigInt(MONEY_SCALE - digits)
  const goal = BigInt(target)
  const adjustable = invoice.items.map(
    (item) =>
      parseDecimalOrZero(item.unitPrice, MONEY_SCALE) > 0n &&
      parseDecimalOrZero(item.quantity, QUANTITY_SCALE) > 0n,
  )
  const indexes = adjustable.flatMap((on, i) => (on ? [i] : []))
  if (indexes.length === 0 || startTotal <= 0 || target < 0) return null

  const itemsFor = (prices: bigint[]): LineItem[] =>
    invoice.items.map((item, i) =>
      adjustable[i] ? { ...item, unitPrice: toDecimalString(prices[i], digits) } : item,
    )
  const totalFor = (prices: bigint[]) =>
    BigInt(calculateTotals({ ...invoice, items: itemsFor(prices) }).total)

  // Prices in minor units. Unit prices typed with more decimals are rounded to the currency's.
  let prices = invoice.items.map((item) =>
    divRound(parseDecimalOrZero(item.unitPrice, MONEY_SCALE), perMinor),
  )
  let total = totalFor(prices)
  for (let round = 0; round < SCALING_ROUNDS && total !== goal && total > 0n; round++) {
    const now = total
    prices = prices.map((price, i) => (adjustable[i] ? divRound(price * goal, now) : price))
    total = totalFor(prices)
  }

  const gapOf = (value: bigint) => (value > goal ? value - goal : goal - value)
  type Move = [index: number, step: bigint][]
  const singles: Move[] = indexes.flatMap((i): Move[] => [[[i, 1n]], [[i, -1n]]])
  // One line up and another down: shifts where the tax rounds without moving the total much.
  const pairs: Move[] =
    indexes.length > MAX_LINES_FOR_PAIRS
      ? []
      : indexes.flatMap((i) =>
          indexes
            .filter((j) => j !== i)
            .map((j): Move => [
              [i, 1n],
              [j, -1n],
            ]),
        )
  /** The move that brings the total closest to the goal, if any gets closer than now. */
  const bestOf = (moves: Move[]) => {
    let best: { prices: bigint[]; total: bigint } | null = null
    for (const move of moves) {
      const candidate = [...prices]
      for (const [i, step] of move) candidate[i] += step
      if (move.some(([i]) => candidate[i] < 0n)) continue
      const candidateTotal = totalFor(candidate)
      if (gapOf(candidateTotal) < gapOf(best?.total ?? total)) {
        best = { prices: candidate, total: candidateTotal }
      }
    }
    return best
  }
  for (let nudge = 0; nudge < MAX_NUDGES && total !== goal; nudge++) {
    const best = bestOf(singles) ?? bestOf(pairs)
    if (!best) break
    prices = best.prices
    total = best.total
  }

  if (total !== goal) {
    const quantity = (i: number) => parseDecimalOrZero(invoice.items[i].quantity, QUANTITY_SCALE)
    const finest = [...indexes]
      .sort((a, b) => Number(quantity(a) - quantity(b)))
      .slice(0, EXACT_SEARCH_LINES)
    const range = finest.length < EXACT_SEARCH_LINES ? EXACT_SEARCH_RANGE_FEW : EXACT_SEARCH_RANGE
    search: for (let r = 1; r <= range; r++) {
      for (const steps of shell(finest.length, r)) {
        if (Math.max(...steps.map(Math.abs)) < r) continue
        const candidate = [...prices]
        finest.forEach((i, k) => (candidate[i] += BigInt(steps[k])))
        if (finest.some((i) => candidate[i] < 0n) || totalFor(candidate) !== goal) continue
        prices = candidate
        total = goal
        break search
      }
    }
  }

  return { items: itemsFor(prices), total: Number(total), exact: total === goal }
}

/**
 * Turn the current total into a tax-included one: 100.00 plus 5% VAT becomes 95.24 plus 4.76 VAT,
 * so the grand total stays 100.00. Also converts invoices saved with prices that include tax
 * (the older "Tax included" mode) into before-tax prices. Null when the invoice charges no tax
 * or has no prices.
 */
export function includeTaxInPrices(invoice: Invoice): (PriceFit & { invoice: Invoice }) | null {
  const totals = calculateTotals(invoice)
  if (totals.taxTotal === 0) return null
  const target = invoice.taxMode === 'inclusive' ? totals.total : totals.afterDiscount
  const exclusive: Invoice = { ...invoice, taxMode: 'exclusive' }
  // Tax means there's a priced line and a positive total, so there's always a fit.
  const fit = fitToTotal(exclusive, target)!
  return { ...fit, invoice: { ...exclusive, items: fit.items } }
}
