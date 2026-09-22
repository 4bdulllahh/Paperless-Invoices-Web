/**
 * Number input that accepts what people actually type. Stored values always use "." as the
 * decimal point ("1234.5"); on screen they use the invoice locale's separator ("1234,5" in de-DE).
 *
 * Both "," and "." are accepted as a decimal point, so "12,50" and "12.50" both mean 12.5.
 * The one ambiguous case, a single separator followed by exactly three digits ("1,500"), follows
 * the locale: in en-US that's fifteen hundred, in de-DE it's one and a half.
 */

type Separators = { decimal: string; group: string }

const separatorCache = new Map<string, Separators>()

export function localeSeparators(locale: string): Separators {
  let separators = separatorCache.get(locale)
  if (!separators) {
    // Seven digits: some locales (e.g. es) only group numbers with five or more.
    const parts = new Intl.NumberFormat(locale, { useGrouping: true }).formatToParts(1234567.8)
    separators = {
      decimal: parts.find((p) => p.type === 'decimal')!.value,
      group: parts.find((p) => p.type === 'group')?.value ?? '',
    }
    separatorCache.set(locale, separators)
  }
  return separators
}

/** User text → canonical decimal string. Anything that isn't a number is passed through to fail validation. */
export function normalizeDecimalInput(text: string, locale: string): string {
  // Spaces (incl. non-breaking) and apostrophes are only ever digit grouping: "1 000", "1'000".
  const compact = text.replace(/[\s'’]/g, '')
  const last = Math.max(compact.lastIndexOf('.'), compact.lastIndexOf(','))
  if (last === -1) return compact

  const separator = compact[last]
  const before = compact.slice(0, last)
  const after = compact.slice(last + 1)
  const repeated = before.includes(separator)
  const isGrouping =
    repeated || (after.length === 3 && separator === localeSeparators(locale).group)

  if (isGrouping) return compact.replace(/[.,]/g, '')
  return `${before.replace(/[.,]/g, '')}.${after}`
}

/** Canonical decimal string → how it's shown while editing: "1234.5" → "1234,5" in de-DE. */
export function displayDecimal(value: string, locale: string): string {
  const { decimal } = localeSeparators(locale)
  return decimal === '.' ? value : value.replace('.', decimal)
}
