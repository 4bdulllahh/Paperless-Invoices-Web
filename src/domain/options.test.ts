import { describe, expect, it } from 'vitest'
import {
  COMMON_CURRENCIES,
  currencyOptions,
  formatSample,
  localeOptions,
  paymentTermsLabel,
  paymentTermsOptions,
} from './options'

describe('currencyOptions', () => {
  const { common, others } = currencyOptions('en-US')

  it('lists common currencies first, labelled with their names', () => {
    expect(common.map((o) => o.value)).toEqual([...COMMON_CURRENCIES])
    expect(common[0]).toEqual({ value: 'USD', label: 'USD — US Dollar' })
  })

  it('lists every other currency alphabetically, without repeats', () => {
    const values = others.map((o) => o.value)
    expect(values).toContain('KWD')
    expect(values).not.toContain('USD')
    const labels = others.map((o) => o.label)
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)))
  })

  it('names currencies in the display language', () => {
    expect(currencyOptions('de-DE').common[1].label).toBe('EUR — Euro')
  })
})

describe('localeOptions', () => {
  it('names each locale in its own language, whatever is selected', () => {
    for (const current of ['en-US', 'de-DE']) {
      const labels = Object.fromEntries(localeOptions(current).map((o) => [o.value, o.label]))
      expect(labels['en-US']).toBe('American English')
      expect(labels['en-GB']).toBe('British English')
      expect(labels['de-DE']).toBe('Deutsch (Deutschland)')
    }
  })

  it('adds the current locale when it is not a common one', () => {
    const options = localeOptions('sv-SE')
    expect(options[0]).toEqual({ value: 'sv-SE', label: 'svenska (Sverige)' })
    expect(options.filter((o) => o.value === 'sv-SE')).toHaveLength(1)
  })
})

describe('formatSample', () => {
  it('shows how money and dates will look', () => {
    expect(formatSample('en-US', 'USD', '2026-09-23')).toBe('$1,234.56 · Sep 23, 2026')
    expect(formatSample('de-DE', 'EUR', '2026-09-23').replace(/\s/g, ' ')).toBe(
      '1.234,56 € · 23.09.2026',
    )
  })
})

describe('payment terms', () => {
  it('labels terms in plain language', () => {
    expect(paymentTermsLabel(0)).toBe('Due on receipt')
    expect(paymentTermsLabel(30)).toBe('Within 30 days (Net 30)')
  })

  it('keeps a custom saved value in the list, in order', () => {
    expect(paymentTermsOptions(14).map((o) => o.value)).toEqual([
      '0',
      '7',
      '14',
      '15',
      '30',
      '45',
      '60',
      '90',
    ])
    expect(paymentTermsOptions(21).map((o) => o.value)).toContain('21')
    expect(paymentTermsOptions(21).map((o) => Number(o.value))).toEqual([
      0, 7, 14, 15, 21, 30, 45, 60, 90,
    ])
  })
})
