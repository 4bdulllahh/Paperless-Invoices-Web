import { describe, expect, it } from 'vitest'
import { formatDate, formatMoney, formatQuantity, formatRate, formatUnitPrice } from './format'

// Intl uses non-breaking spaces (e.g. "1.234,56 €"); compare with plain spaces.
const plain = (s: string) => s.replace(/\s/g, ' ')

describe('formatMoney', () => {
  it.each([
    [2999, 'USD', 'en-US', '$29.99'],
    [-1000, 'USD', 'en-US', '-$10.00'],
    [123456, 'EUR', 'de-DE', '1.234,56 €'],
    [4500, 'JPY', 'en-US', '¥4,500'],
    [24690, 'KWD', 'en-US', 'KWD 24.690'],
    [9_999_999_990_000, 'USD', 'en-US', '$99,999,999,900.00'],
  ])('%i %s in %s is %j', (minor, currency, locale, expected) => {
    expect(plain(formatMoney(minor, currency, locale))).toBe(expected)
  })
})

describe('formatUnitPrice', () => {
  it('keeps extra precision but pads to the currency’s decimals', () => {
    expect(formatUnitPrice('0.125', 'USD', 'en-US')).toBe('$0.125')
    expect(formatUnitPrice('5', 'USD', 'en-US')).toBe('$5.00')
    expect(formatUnitPrice('1500', 'JPY', 'en-US')).toBe('¥1,500')
  })

  it('shows invalid input as typed', () => {
    expect(formatUnitPrice('12,50', 'USD', 'en-US')).toBe('12,50')
  })
})

describe('formatRate', () => {
  it('formats parts per million as a percentage', () => {
    expect(formatRate(88750, 'en-US')).toBe('8.875%')
    expect(formatRate(200000, 'en-US')).toBe('20%')
    expect(plain(formatRate(200000, 'de-DE'))).toBe('20 %')
  })
})

describe('formatQuantity', () => {
  it('normalises typed quantities', () => {
    expect(formatQuantity('1.50', 'en-US')).toBe('1.5')
    expect(formatQuantity('1000', 'en-US')).toBe('1,000')
    expect(formatQuantity('abc', 'en-US')).toBe('abc')
  })
})

describe('formatDate', () => {
  it('formats the calendar date without shifting it by time zone', () => {
    expect(formatDate('2026-09-23', 'en-US')).toBe('Sep 23, 2026')
    expect(formatDate('2026-01-01', 'en-US')).toBe('Jan 1, 2026')
  })
})
