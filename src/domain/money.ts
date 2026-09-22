import { toDecimalString } from './decimal'

const digitsCache = new Map<string, number>()

/**
 * Number of minor-unit digits for a currency (USD 2, JPY 0, KWD 3), taken from the browser's
 * Intl data so calculation and formatting always agree.
 */
export function currencyDigits(currency: string): number {
  let digits = digitsCache.get(currency)
  if (digits === undefined) {
    digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits!
    digitsCache.set(currency, digits)
  }
  return digits
}

/** Whether the browser recognises the code as a currency. */
export function isSupportedCurrency(currency: string): boolean {
  if (!/^[A-Z]{3}$/.test(currency)) return false
  try {
    return Intl.supportedValuesOf('currency').includes(currency)
  } catch {
    return false
  }
}

/** Minor units as an exact decimal string: minorToDecimal(2999, 'USD') === '29.99' */
export function minorToDecimal(minor: number, currency: string): string {
  return toDecimalString(BigInt(minor), currencyDigits(currency))
}
