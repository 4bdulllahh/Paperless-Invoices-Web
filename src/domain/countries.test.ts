import { describe, expect, it } from 'vitest'
import {
  COUNTRY_PRESETS,
  countryName,
  countryOptions,
  countryInSentence,
  countrySettings,
  findCountry,
  guessCountry,
} from './countries'
import { settingsSchema } from './records'
import { percentSchema } from './schema'

describe('country presets', () => {
  it('are unique, valid and print with the PDF fonts', () => {
    const codes = COUNTRY_PRESETS.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const preset of COUNTRY_PRESETS) {
      expect(Intl.supportedValuesOf('currency'), preset.code).toContain(preset.currency)
      expect(percentSchema.safeParse(preset.taxRate).success, preset.code).toBe(true)
      // Money and dates must only use Latin letters and common symbols: the PDF fonts have
      // no Arabic digits, Thai years or Greek month names.
      const sample =
        new Intl.NumberFormat(preset.locale, {
          style: 'currency',
          currency: preset.currency,
        }).format(1234.56) +
        new Intl.DateTimeFormat(preset.locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
          new Date('2026-09-23T00:00:00Z'),
        )
      for (const char of sample) {
        const code = char.codePointAt(0)!
        const printable =
          code < 0x250 || (code >= 0x2000 && code <= 0x206f) || (code >= 0x20a0 && code <= 0x20cf)
        expect(printable, `${preset.code}: ${sample}`).toBe(true)
      }
    }
  })

  it('know the rules that matter for common countries', () => {
    expect(findCountry('AE')).toMatchObject({
      currency: 'AED',
      taxLabel: 'VAT',
      taxRate: '5',
      taxIdLabel: 'TRN',
      title: 'Tax Invoice',
      amountInWords: true,
      lineTax: true,
      sign: true,
    })
    expect(findCountry('AE')?.note).toMatch(/1 July 2027/)
    expect(findCountry('IN')).toMatchObject({ taxIdLabel: 'GSTIN', title: 'Tax Invoice' })
    expect(findCountry('DE')).toMatchObject({
      currency: 'EUR',
      taxRate: '19',
      title: 'Invoice',
      lineTax: false,
      sign: false,
    })
    expect(findCountry('US')).toMatchObject({ taxLabel: 'Sales tax', taxRate: '' })
    expect(findCountry('US')?.note).toMatch(/state/)
    expect(findCountry('GB')?.note).toBeUndefined()
    expect(findCountry('ZZ')).toBeUndefined()
  })

  it('list countries by English name', () => {
    const options = countryOptions()
    expect(options).toHaveLength(COUNTRY_PRESETS.length)
    expect(options.find((o) => o.value === 'AE')?.label).toBe('United Arab Emirates')
    const labels = options.map((o) => o.label)
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)))
    expect(countryName('PK')).toBe('Pakistan')
    expect(countryInSentence('AE')).toBe('the United Arab Emirates')
    expect(countryInSentence('IN')).toBe('India')
  })

  it('turn into valid settings', () => {
    const patch = countrySettings(findCountry('SA')!)
    expect(patch).toEqual({
      country: 'SA',
      currency: 'SAR',
      locale: 'en-AE',
      taxLabel: 'VAT',
      defaultTaxRate: '15',
      taxIdLabel: 'VAT no.',
      documentTitle: 'Tax Invoice',
      amountInWords: true,
      showLineTax: true,
      signInvoices: true,
    })
    const base = settingsSchema.parse({
      currency: 'USD',
      locale: 'en-US',
      taxMode: 'exclusive',
      taxLabel: '',
      defaultTaxRate: '',
      paymentTermsDays: 14,
      numberPattern: 'INV-{####}',
      nextSequence: 1,
      templateId: 'modern',
    })
    for (const preset of COUNTRY_PRESETS) {
      expect(settingsSchema.safeParse({ ...base, ...countrySettings(preset) }).success).toBe(true)
    }
  })

  it('guess the country from the time zone, then the browser language', () => {
    expect(guessCountry('Asia/Dubai', ['en-US'])).toBe('AE')
    expect(guessCountry('Asia/Calcutta', [])).toBe('IN')
    expect(guessCountry('Australia/Perth', [])).toBe('AU')
    expect(guessCountry('Etc/UTC', ['en', 'ar-AE'])).toBe('AE')
    expect(guessCountry('Etc/UTC', ['en-Latn-GB'])).toBe('GB')
    // Regions without a preset, and languages without a region, are skipped.
    expect(guessCountry('Etc/UTC', ['en', 'es-419', 'en-AQ', 'fr-CA'])).toBe('CA')
    expect(guessCountry('Antarctica/Troll', ['en', 'en-AQ'])).toBe('')
  })
})
