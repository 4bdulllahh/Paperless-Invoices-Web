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
      'Four Thousand Two Hundred Forty-Seven US Dollars And Seventy-Six Cents.',
    )
    expect(amountInWords(101, 'USD')).toBe('One US Dollar And One Cent.')
    expect(amountInWords(5000, 'GBP')).toBe('Fifty Pounds Sterling.')
    expect(amountInWords(1, 'GBP')).toBe('Zero Pounds Sterling And One Penny.')
  })

  it('capitalises every word and ends with a full stop', () => {
    expect(amountInWords(10200, 'USD')).toBe('One Hundred Two US Dollars.')
    expect(amountInWords(643860, 'AED')).toBe(
      'Six Thousand Four Hundred Thirty-Eight Dirhams And Sixty Fils Only.',
    )
    expect(amountInWords(4500, 'SEK')).toBe('Forty-Five Kronor.')
    expect(amountInWords(5, 'SEK')).toBe('Zero Kronor And Five Öre.')
  })

  it('uses lakhs and ends with “Only” for rupees', () => {
    expect(amountInWords(32_000_050, 'INR')).toBe(
      'Three Lakh Twenty Thousand Rupees And Fifty Paise Only.',
    )
  })

  it('ends Gulf amounts with “Only”, with three-decimal currencies', () => {
    expect(amountInWords(424776, 'AED')).toBe(
      'Four Thousand Two Hundred Forty-Seven Dirhams And Seventy-Six Fils Only.',
    )
    expect(amountInWords(1250, 'KWD')).toBe('One Dinar And Two Hundred Fifty Fils Only.')
  })

  it('handles currencies without minor units', () => {
    expect(amountInWords(1500, 'JPY')).toBe('One Thousand Five Hundred Yen.')
  })

  it('falls back to the currency’s English name and a fraction', () => {
    expect(amountInWords(123445, 'CZK')).toBe(
      'One Thousand Two Hundred Thirty-Four Czech Koruna And 45/100.',
    )
    expect(amountInWords(100, 'CZK')).toBe('One Czech Koruna.')
  })
})
