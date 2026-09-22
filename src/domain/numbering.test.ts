import { describe, expect, it } from 'vitest'
import { DEFAULT_NUMBER_PATTERN, formatInvoiceNumber, hasSequenceToken } from './numbering'

describe('formatInvoiceNumber', () => {
  it('fills in the default pattern', () => {
    expect(formatInvoiceNumber(DEFAULT_NUMBER_PATTERN, 42, '2026-09-23')).toBe('INV-2026-0042')
  })

  it('supports every date token', () => {
    expect(formatInvoiceNumber('{YY}{MM}{DD}-{##}', 7, '2026-09-03')).toBe('260903-07')
  })

  it('never truncates a sequence longer than its padding', () => {
    expect(formatInvoiceNumber('#{##}', 12345, '2026-01-01')).toBe('#12345')
  })

  it('leaves unknown text and braces alone', () => {
    expect(formatInvoiceNumber('{CLIENT}/{#}', 3, '2026-01-01')).toBe('{CLIENT}/3')
  })
})

describe('hasSequenceToken', () => {
  it('requires a {#} token', () => {
    expect(hasSequenceToken(DEFAULT_NUMBER_PATTERN)).toBe(true)
    expect(hasSequenceToken('{#}')).toBe(true)
    expect(hasSequenceToken('INV-{YYYY}')).toBe(false)
    expect(hasSequenceToken('INV-#')).toBe(false)
  })
})
