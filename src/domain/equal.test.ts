import { describe, expect, it } from 'vitest'
import { sameData } from './equal'

describe('sameData', () => {
  it('compares nested objects and arrays by value, ignoring key order', () => {
    expect(sameData({ a: 1, b: { c: [1, 'x'] } }, { b: { c: [1, 'x'] }, a: 1 })).toBe(true)
    expect(sameData([], [])).toBe(true)
    expect(sameData(null, null)).toBe(true)
  })

  it.each([
    ['different values', { a: 1 }, { a: 2 }],
    ['a missing key', { a: 1, b: undefined }, { a: 1, c: undefined }],
    ['an extra key', { a: 1 }, { a: 1, b: 2 }],
    ['array order', [1, 2], [2, 1]],
    ['array length', [1], [1, 1]],
    ['an array and an object', [], {}],
    ['null and an object', null, {}],
    ['an object and a string', {}, '{}'],
  ])('tells apart %s', (_, a, b) => {
    expect(sameData(a, b)).toBe(false)
  })
})
