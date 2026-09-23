import { formatDate, formatMoney } from './format'
import type { TemplateId } from './schema'

/** Choices offered in onboarding and settings, labelled in the user's own language. */

export type Option = { value: string; label: string }

/** Shown first in the currency picker; every other currency follows alphabetically. */
export const COMMON_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'INR',
  'PKR',
  'AED',
  'SAR',
  'CAD',
  'AUD',
  'NZD',
  'SGD',
  'JPY',
  'CNY',
  'CHF',
  'ZAR',
  'NGN',
  'BRL',
  'MXN',
] as const

export const COMMON_LOCALES = [
  'en-US',
  'en-GB',
  'en-IN',
  'en-PK',
  'en-CA',
  'en-AU',
  'de-DE',
  'fr-FR',
  'es-ES',
  'it-IT',
  'nl-NL',
  'pt-BR',
  'ar-AE',
  'ur-PK',
  'hi-IN',
  'ja-JP',
  'zh-CN',
] as const

/** Template names and what sets each apart, for pickers. */
export const TEMPLATE_OPTIONS: readonly {
  value: TemplateId
  label: string
  description: string
}[] = [
  { value: 'modern', label: 'Modern', description: 'Dark header, rounded panels' },
  { value: 'classic', label: 'Classic', description: 'Serif letterhead, ruled table' },
  { value: 'minimal', label: 'Minimal', description: 'Lots of white space' },
  { value: 'bold', label: 'Bold', description: 'Big orange header' },
  { value: 'corporate', label: 'Corporate', description: 'Details in a sidebar' },
  { value: 'compact', label: 'Compact', description: 'Dense, for long item lists' },
]

/** 0 is "on delivery"; the rest are "Net N" terms. */
export const PAYMENT_TERMS = [0, 15, 30, 45, 60, 75, 90] as const

export function currencyOptions(displayLocale: string): { common: Option[]; others: Option[] } {
  const names = new Intl.DisplayNames([displayLocale], { type: 'currency' })
  const option = (code: string): Option => ({ value: code, label: `${code} — ${names.of(code)}` })
  const common = new Set<string>(COMMON_CURRENCIES)
  return {
    common: COMMON_CURRENCIES.map(option),
    others: Intl.supportedValuesOf('currency')
      .filter((code) => !common.has(code))
      .map(option)
      .sort((a, b) => a.label.localeCompare(b.label)),
  }
}

/**
 * Common locales plus the current one, each named in its own language ("Deutsch (Deutschland)",
 * "British English") so people can find theirs whatever is selected.
 */
export function localeOptions(current: string): Option[] {
  const locales: string[] = [...COMMON_LOCALES]
  if (!locales.includes(current)) locales.unshift(current)
  return locales.map((locale) => ({
    value: locale,
    // With the default fallback ('code'), of() returns the code itself for unknown locales.
    label: new Intl.DisplayNames([locale], { type: 'language' }).of(locale) as string,
  }))
}

/** How amounts and dates will look: "$1,234.56 · Sep 23, 2026". */
export function formatSample(locale: string, currency: string, isoDate: string): string {
  return `${formatMoney(123456, currency, locale)} · ${formatDate(isoDate, locale)}`
}

export function paymentTermsLabel(days: number): string {
  if (days === 0) return 'On delivery'
  return `Within ${days} days (Net ${days})`
}

/** As printed on an invoice: "Net 30 days", or "On delivery". */
export function paymentTermsText(days: number): string {
  if (days === 0) return 'On delivery'
  return `Net ${days} ${days === 1 ? 'day' : 'days'}`
}

/** The standard terms, plus the saved value if it's a custom one. */
export function paymentTermsOptions(current: number): Option[] {
  const days: number[] = [...PAYMENT_TERMS]
  if (!days.includes(current)) days.push(current)
  return days.sort((a, b) => a - b).map((d) => ({ value: String(d), label: paymentTermsLabel(d) }))
}
