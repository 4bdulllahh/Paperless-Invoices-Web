import { describe, expect, it } from 'vitest'
import { formatBytes } from './formatBytes'

describe('formatBytes', () => {
  it.each([
    [0, '0 byte'],
    [512, '512 byte'],
    [1536, '1.5 kB'],
    [5 * 1024 * 1024, '5 MB'],
    [3 * 1024 ** 4, '3,072 GB'],
  ])('%i bytes is %j', (bytes, expected) => {
    expect(formatBytes(bytes, 'en-US')).toBe(expected)
  })
})
