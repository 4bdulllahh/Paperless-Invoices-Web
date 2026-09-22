/**
 * Exact decimal arithmetic on scaled BigInts.
 *
 * Amounts, quantities and rates are kept as the strings the user typed ("19.99", "1.5", "8.875")
 * and parsed into integers at a fixed scale, so no calculation ever touches floating point.
 */

/** Decimal places accepted for quantities, e.g. 1.5 hours or 0.0125 kg. */
export const QUANTITY_SCALE = 4
/** Decimal places accepted for money input. Converted to the currency's minor units when calculated. */
export const MONEY_SCALE = 4
/** Decimal places accepted for percentages, e.g. 8.875%. A parsed percentage is in parts per million. */
export const RATE_SCALE = 4

export const PPM = 1_000_000n

const DECIMAL = /^(?:\d+\.?\d*|\.\d+)$/

/**
 * Parse a non-negative decimal string into an integer scaled by 10^scale.
 * "" is 0. Returns null for anything that isn't a plain decimal or has too many decimal places.
 *
 * parseDecimal('12.5', 2) === 1250n
 */
export function parseDecimal(input: string, scale: number): bigint | null {
  const value = input.trim()
  if (value === '') return 0n
  if (!DECIMAL.test(value)) return null
  const [whole, fraction = ''] = value.split('.')
  if (fraction.length > scale) return null
  return BigInt((whole || '0') + fraction.padEnd(scale, '0'))
}

/** Like parseDecimal, but invalid input counts as 0 so a half-typed draft still totals up. */
export function parseDecimalOrZero(input: string, scale: number): bigint {
  return parseDecimal(input, scale) ?? 0n
}

/** Integer division rounding half away from zero (commercial rounding). */
export function divRound(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new RangeError('Division by zero')
  const quotient = numerator / denominator
  const remainder = numerator % denominator
  const abs = (n: bigint) => (n < 0n ? -n : n)
  if (2n * abs(remainder) < abs(denominator)) return quotient
  return numerator < 0n === denominator < 0n ? quotient + 1n : quotient - 1n
}

/**
 * Split `total` across `weights` in proportion, so the parts always add up to exactly `total`.
 * Leftover units go to the largest remainders (ties to the earliest item).
 */
export function allocate(total: bigint, weights: readonly bigint[]): bigint[] {
  const weightSum = weights.reduce((sum, w) => sum + w, 0n)
  if (weightSum === 0n) return weights.map(() => 0n)

  const shares = weights.map((w) => (total * w) / weightSum)
  let leftover = total - shares.reduce((sum, s) => sum + s, 0n)
  const byRemainder = weights
    .map((w, index) => ({ index, remainder: (total * w) % weightSum }))
    .sort((a, b) =>
      a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
    )
  for (let k = 0; leftover > 0n; k++, leftover--) shares[byRemainder[k].index] += 1n
  return shares
}

export function minBigInt(a: bigint, b: bigint): bigint {
  return a < b ? a : b
}

/** Convert a scaled integer back to a plain decimal string: toDecimalString(1250n, 2) === '12.50' */
export function toDecimalString(value: bigint, scale: number): string {
  const negative = value < 0n
  const digits = (negative ? -value : value).toString().padStart(scale + 1, '0')
  const whole = digits.slice(0, digits.length - scale)
  const fraction = digits.slice(digits.length - scale)
  return `${negative ? '-' : ''}${whole}${scale > 0 ? `.${fraction}` : ''}`
}
