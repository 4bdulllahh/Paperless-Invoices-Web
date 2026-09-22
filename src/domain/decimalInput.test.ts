import { describe, expect, it, vi } from 'vitest'
import { displayDecimal, localeSeparators, normalizeDecimalInput } from './decimalInput'

describe('localeSeparators', () => {
  it('reads separators from the locale', () => {
    expect(localeSeparators('en-US')).toEqual({ decimal: '.', group: ',' })
    expect(localeSeparators('de-DE')).toEqual({ decimal: ',', group: '.' })
    expect(localeSeparators('fr-FR').decimal).toBe(',')
    expect(localeSeparators('de-DE')).toBe(localeSeparators('de-DE')) // cached
  })

  it('finds grouping in locales that only group large numbers', () => {
    expect(localeSeparators('es-ES')).toEqual({ decimal: ',', group: '.' })
  })

  it('copes with a format that has no grouping separator', () => {
    const spy = vi.spyOn(Intl.NumberFormat.prototype, 'formatToParts').mockReturnValue([
      { type: 'integer', value: '1234567' },
      { type: 'decimal', value: '.' },
      { type: 'fraction', value: '8' },
    ])
    expect(localeSeparators('xx-NOGROUP')).toEqual({ decimal: '.', group: '' })
    spy.mockRestore()
  })
})

describe('normalizeDecimalInput', () => {
  it.each`
    text           | locale     | expected     | why
    ${'12.50'}     | ${'en-US'} | ${'12.50'}   | ${'plain decimal'}
    ${'12,50'}     | ${'en-US'} | ${'12.50'}   | ${'decimal comma typed in an English locale'}
    ${'12,50'}     | ${'de-DE'} | ${'12.50'}   | ${'decimal comma'}
    ${'12.5'}      | ${'de-DE'} | ${'12.5'}    | ${'decimal point typed in a German locale'}
    ${'1,500'}     | ${'en-US'} | ${'1500'}    | ${'ambiguous: English grouping'}
    ${'1.500'}     | ${'de-DE'} | ${'1500'}    | ${'ambiguous: German grouping'}
    ${'1,500'}     | ${'de-DE'} | ${'1.500'}   | ${'ambiguous: German decimal'}
    ${'1.500'}     | ${'en-US'} | ${'1.500'}   | ${'ambiguous: English decimal'}
    ${'1,234.56'}  | ${'en-US'} | ${'1234.56'} | ${'grouping and decimal'}
    ${'1.234,56'}  | ${'de-DE'} | ${'1234.56'} | ${'German grouping and decimal'}
    ${'1,000,000'} | ${'de-DE'} | ${'1000000'} | ${'a repeated separator is grouping'}
    ${'1 234,5'}   | ${'fr-FR'} | ${'1234.5'}  | ${'space grouping'}
    ${"1'234.5"}   | ${'de-CH'} | ${'1234.5'}  | ${'apostrophe grouping'}
    ${'5,'}        | ${'de-DE'} | ${'5.'}      | ${'half-typed'}
    ${',5'}        | ${'de-DE'} | ${'.5'}      | ${'leading separator'}
    ${' 42 '}      | ${'en-US'} | ${'42'}      | ${'whole number'}
    ${''}          | ${'en-US'} | ${''}        | ${'empty'}
    ${'abc'}       | ${'en-US'} | ${'abc'}     | ${'not a number: left to fail validation'}
  `('$why: "$text" in $locale → "$expected"', ({ text, locale, expected }) => {
    expect(normalizeDecimalInput(text, locale)).toBe(expected)
  })
})

describe('displayDecimal', () => {
  it('uses the locale’s decimal separator', () => {
    expect(displayDecimal('1234.5', 'en-US')).toBe('1234.5')
    expect(displayDecimal('1234.5', 'de-DE')).toBe('1234,5')
    expect(displayDecimal('', 'de-DE')).toBe('')
  })
})
