import { describe, expect, it } from 'vitest'
import { currencyDigits, isSupportedCurrency, minorToDecimal } from './money'

describe('currencyDigits', () => {
  it.each([
    ['USD', 2],
    ['EUR', 2],
    ['JPY', 0],
    ['KWD', 3],
  ])('%s has %i minor digits', (currency, digits) => {
    expect(currencyDigits(currency)).toBe(digits)
    expect(currencyDigits(currency)).toBe(digits) // cached path
  })
})

describe('isSupportedCurrency', () => {
  it('accepts known ISO codes only', () => {
    expect(isSupportedCurrency('USD')).toBe(true)
    expect(isSupportedCurrency('INR')).toBe(true)
    expect(isSupportedCurrency('usd')).toBe(false)
    expect(isSupportedCurrency('XYZ')).toBe(false)
    expect(isSupportedCurrency('DOLLAR')).toBe(false)
  })

  it('fails closed if the browser cannot list currencies', () => {
    const original = Intl.supportedValuesOf
    Intl.supportedValuesOf = () => {
      throw new Error('unsupported')
    }
    try {
      expect(isSupportedCurrency('USD')).toBe(false)
    } finally {
      Intl.supportedValuesOf = original
    }
  })
})

describe('minorToDecimal', () => {
  it('uses the currency’s own precision', () => {
    expect(minorToDecimal(2999, 'USD')).toBe('29.99')
    expect(minorToDecimal(4500, 'JPY')).toBe('4500')
    expect(minorToDecimal(24690, 'KWD')).toBe('24.690')
  })
})
