import { describe, expect, it } from 'vitest'
import {
  COUNTRY_PRESETS,
  countryName,
  countryOptions,
  countrySettings,
  findCountry,
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
      title: 'Tax invoice',
      amountInWords: true,
    })
    expect(findCountry('IN')).toMatchObject({ taxIdLabel: 'GSTIN', title: 'Tax invoice' })
    expect(findCountry('DE')).toMatchObject({ currency: 'EUR', taxRate: '19', title: 'Invoice' })
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
      documentTitle: 'Tax invoice',
      amountInWords: true,
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
})
