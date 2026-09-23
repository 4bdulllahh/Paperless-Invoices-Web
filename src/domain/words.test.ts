import { describe, expect, it } from 'vitest'
import { amountInWords, numberToWords } from './words'

describe('numberToWords', () => {
  it.each([
    [0, 'zero'],
    [7, 'seven'],
    [13, 'thirteen'],
    [40, 'forty'],
    [42, 'forty-two'],
    [100, 'one hundred'],
    [105, 'one hundred five'],
    [999, 'nine hundred ninety-nine'],
    [1000, 'one thousand'],
    [3247, 'three thousand two hundred forty-seven'],
    [1_000_001, 'one million one'],
    [12_345_678, 'twelve million three hundred forty-five thousand six hundred seventy-eight'],
    [2_000_000_000_000, 'two trillion'],
    [5_000_000_000_000_000, 'five thousand trillion'],
  ])('%i → %s', (n, words) => {
    expect(numberToWords(n)).toBe(words)
  })

  it('counts in lakhs and crores for South Asian amounts', () => {
    expect(numberToWords(320_000, true)).toBe('three lakh twenty thousand')
    expect(numberToWords(12_34_56_789, true)).toBe(
      'twelve crore thirty-four lakh fifty-six thousand seven hundred eighty-nine',
    )
    expect(numberToWords(1_20_00_00_000, true)).toBe('one hundred twenty crore')
  })

  it('refuses what it can’t write', () => {
    expect(() => numberToWords(-1)).toThrow(RangeError)
    expect(() => numberToWords(1.5)).toThrow(RangeError)
  })
})

describe('amountInWords', () => {
  it('names the currency and its minor unit, singular or plural', () => {
    expect(amountInWords(424776, 'USD')).toBe(
      'Four thousand two hundred forty-seven US dollars and seventy-six cents',
    )
    expect(amountInWords(101, 'USD')).toBe('One US dollar and one cent')
    expect(amountInWords(5000, 'GBP')).toBe('Fifty pounds sterling')
    expect(amountInWords(1, 'GBP')).toBe('Zero pounds sterling and one penny')
  })

  it('uses lakhs and ends with “only” for rupees', () => {
    expect(amountInWords(32_000_050, 'INR')).toBe(
      'Three lakh twenty thousand rupees and fifty paise only',
    )
  })

  it('ends Gulf amounts with “only”, with three-decimal currencies', () => {
    expect(amountInWords(424776, 'AED')).toBe(
      'Four thousand two hundred forty-seven dirhams and seventy-six fils only',
    )
    expect(amountInWords(1250, 'KWD')).toBe('One dinar and two hundred fifty fils only')
  })

  it('handles currencies without minor units', () => {
    expect(amountInWords(1500, 'JPY')).toBe('One thousand five hundred yen')
  })

  it('falls back to the currency’s English name and a fraction', () => {
    expect(amountInWords(123445, 'CZK')).toBe(
      'One thousand two hundred thirty-four Czech Koruna and 45/100',
    )
    expect(amountInWords(100, 'CZK')).toBe('One Czech Koruna')
  })
})
