import { describe, expect, it } from 'vitest'
import { allocate, divRound, parseDecimal, parseDecimalOrZero, toDecimalString } from './decimal'

describe('parseDecimal', () => {
  it.each([
    ['12.5', 2, 1250n],
    ['12', 2, 1200n],
    ['0.05', 2, 5n],
    ['.5', 2, 50n],
    ['5.', 2, 500n],
    ['  7.25 ', 2, 725n],
    ['', 2, 0n],
    ['1000000', 0, 1000000n],
    ['8.875', 4, 88750n],
  ])('parses %j at scale %i', (input, scale, expected) => {
    expect(parseDecimal(input, scale)).toBe(expected)
  })

  it.each(['abc', '1.2.3', '-1', '1e5', '.', '1,000', '12.345'])('rejects %j', (input) => {
    expect(parseDecimal(input, 2)).toBeNull()
  })

  it('treats invalid input as zero when asked', () => {
    expect(parseDecimalOrZero('oops', 2)).toBe(0n)
    expect(parseDecimalOrZero('3.1', 2)).toBe(310n)
  })
})

describe('divRound', () => {
  it.each([
    [5n, 2n, 3n],
    [4n, 2n, 2n],
    [7n, 3n, 2n],
    [8n, 3n, 3n],
    [-5n, 2n, -3n],
    [-7n, 3n, -2n],
    [7n, -2n, -4n],
    [-7n, -2n, 4n],
    [0n, 5n, 0n],
  ])('%s / %s rounds half away from zero to %s', (n, d, expected) => {
    expect(divRound(n, d)).toBe(expected)
  })

  it('refuses to divide by zero', () => {
    expect(() => divRound(1n, 0n)).toThrow(RangeError)
  })
})

describe('allocate', () => {
  it('splits in proportion and always sums to the total', () => {
    expect(allocate(100n, [100n, 100n, 100n])).toEqual([34n, 33n, 33n])
    expect(allocate(1000n, [3n, 2n, 1n])).toEqual([500n, 333n, 167n])
    const shares = allocate(9999n, [17n, 29n, 31n, 1n])
    expect(shares.reduce((a, b) => a + b, 0n)).toBe(9999n)
  })

  it('gives leftovers to the largest remainders', () => {
    // exact shares 1.6, 1.4 → floors 1, 1, leftover 1 goes to the 0.6 remainder
    expect(allocate(3n, [8n, 7n])).toEqual([2n, 1n])
  })

  it('returns zeros when there is nothing to weigh against', () => {
    expect(allocate(0n, [0n, 0n])).toEqual([0n, 0n])
    expect(allocate(0n, [])).toEqual([])
  })
})

describe('toDecimalString', () => {
  it.each([
    [1250n, 2, '12.50'],
    [5n, 2, '0.05'],
    [-5n, 2, '-0.05'],
    [4500n, 0, '4500'],
    [24690n, 3, '24.690'],
    [0n, 2, '0.00'],
  ])('%s at scale %i is %j', (value, scale, expected) => {
    expect(toDecimalString(value, scale)).toBe(expected)
  })
})
