import { MONEY_SCALE, parseDecimal, QUANTITY_SCALE, toDecimalString } from './decimal'
import { currencyDigits, minorToDecimal } from './money'

/**
 * Locale-aware display strings. Numbers are passed to Intl as exact decimal strings,
 * so formatting never introduces floating-point error.
 */

type IntlDecimal = Intl.StringNumericLiteral

export function formatMoney(minor: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    minorToDecimal(minor, currency) as IntlDecimal,
  )
}

/**
 * A typed unit price, which may be more precise than the currency: "0.125" USD → "$0.125",
 * "5" USD → "$5.00". Invalid input is shown as typed.
 */
export function formatUnitPrice(price: string, currency: string, locale: string): string {
  const scaled = parseDecimal(price, MONEY_SCALE)
  if (scaled === null) return price
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currencyDigits(currency),
    maximumFractionDigits: MONEY_SCALE,
  }).format(toDecimalString(scaled, MONEY_SCALE) as IntlDecimal)
}

/** Rate in parts per million as a percentage: 88750 → "8.875%" (or "8,875 %" in de-DE). */
export function formatRate(ppm: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 4 }).format(
    toDecimalString(BigInt(ppm), 6) as IntlDecimal,
  )
}

/** A typed quantity for display: "1.50" → "1.5", "1000" → "1,000". Invalid input is shown as typed. */
export function formatQuantity(quantity: string, locale: string): string {
  const scaled = parseDecimal(quantity, QUANTITY_SCALE)
  if (scaled === null) return quantity
  return new Intl.NumberFormat(locale, { maximumFractionDigits: QUANTITY_SCALE }).format(
    toDecimalString(scaled, QUANTITY_SCALE) as IntlDecimal,
  )
}

/** "2026-09-23" → "23 Sept 2026" (en-GB) or "Sep 23, 2026" (en-US). */
export function formatDate(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${isoDate}T00:00:00Z`),
  )
}
