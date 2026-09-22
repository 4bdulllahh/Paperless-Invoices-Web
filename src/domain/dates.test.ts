import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, isOverdue, todayIso } from './dates'

describe('addDays', () => {
  it.each([
    ['2026-09-23', 14, '2026-10-07'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2028-02-28', 1, '2028-02-29'], // leap year
    ['2027-02-28', 1, '2027-03-01'],
    ['2026-03-29', 0, '2026-03-29'],
    ['2026-01-10', -15, '2025-12-26'],
  ])('%s + %i days is %s', (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected)
  })
})

describe('todayIso', () => {
  it('uses the local calendar date with zero padding', () => {
    expect(todayIso(new Date(2026, 8, 3, 23, 59))).toBe('2026-09-03')
    expect(todayIso(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01')
  })

  it('defaults to now', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('isOverdue', () => {
  it('is overdue only after the due date', () => {
    expect(isOverdue('2026-09-22', '2026-09-23')).toBe(true)
    expect(isOverdue('2026-09-23', '2026-09-23')).toBe(false)
    expect(isOverdue('2026-10-01', '2026-09-23')).toBe(false)
  })
})

describe('daysBetween', () => {
  it.each([
    ['2026-09-23', '2026-10-07', 14],
    ['2026-09-23', '2026-09-23', 0],
    ['2026-10-07', '2026-09-23', -14],
    ['2028-02-01', '2028-03-01', 29], // leap year
    ['2026-03-28', '2026-03-30', 2], // across a daylight-saving change
  ])('%s → %s is %i days', (from, to, days) => {
    expect(daysBetween(from, to)).toBe(days)
  })
})
