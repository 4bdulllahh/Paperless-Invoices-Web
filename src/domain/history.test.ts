import { describe, expect, it } from 'vitest'
import { countByFilter, entryStatus, filterHistory, issuedAssets } from './history'
import { emptyPaymentDetails, type HistoryEntry } from './records'
import { createSampleInvoice } from './sample'
import type { Invoice } from './schema'

const TODAY = '2026-10-10'

function entry(
  id: string,
  overrides: Partial<Invoice>,
  status: HistoryEntry['status'] = 'unpaid',
): HistoryEntry {
  return {
    id,
    invoice: createSampleInvoice({ id, ...overrides }),
    issuedWith: null,
    savedAt: '2026-09-23T10:00:00.000Z',
    status,
    paidAt: status === 'paid' ? '2026-10-01' : null,
  }
}

const northwind = entry('a', { number: 'INV-1', dueDate: '2026-10-20' })
const contoso = entry('b', {
  number: 'INV-2',
  dueDate: '2026-10-01',
  to: { name: 'Contoso', email: 'ap@contoso.com', phone: '', address: '', taxId: '' },
})
const paid = entry('c', { number: 'INV-3', dueDate: '2026-09-01' }, 'paid')
const entries = [northwind, contoso, paid]

describe('entryStatus', () => {
  it('is overdue only when unpaid after the due date', () => {
    expect(entryStatus(northwind, TODAY)).toBe('unpaid')
    expect(entryStatus(contoso, TODAY)).toBe('overdue')
    expect(entryStatus(paid, TODAY)).toBe('paid')
    // Due today is not overdue yet.
    expect(entryStatus(contoso, '2026-10-01')).toBe('unpaid')
  })
})

describe('filterHistory', () => {
  const ids = (query: string, filter: Parameters<typeof filterHistory>[1]['filter']) =>
    filterHistory(entries, { query, filter }, TODAY).map((e) => e.id)

  it('filters by status; overdue invoices count as unpaid', () => {
    expect(ids('', 'all')).toEqual(['a', 'b', 'c'])
    expect(ids('', 'unpaid')).toEqual(['a', 'b'])
    expect(ids('', 'overdue')).toEqual(['b'])
    expect(ids('', 'paid')).toEqual(['c'])
  })

  it('searches number, client name and email, ignoring case and spaces', () => {
    expect(ids(' inv-2 ', 'all')).toEqual(['b'])
    expect(ids('NORTHWIND', 'all')).toEqual(['a', 'c'])
    expect(ids('ap@contoso', 'all')).toEqual(['b'])
    expect(ids('northwind', 'paid')).toEqual(['c'])
    expect(ids('nobody', 'all')).toEqual([])
  })
})

describe('countByFilter', () => {
  it('counts what each filter would show', () => {
    expect(countByFilter(entries, TODAY)).toEqual({ all: 3, unpaid: 2, overdue: 1, paid: 1 })
    expect(countByFilter([], TODAY)).toEqual({ all: 0, unpaid: 0, overdue: 0, paid: 0 })
  })
})

describe('issuedAssets', () => {
  const logo = { dataUrl: 'data:image/png;base64,AAAA', width: 2, height: 1 }
  const current = {
    payment: { ...emptyPaymentDetails(), instructions: 'New bank' },
    logo,
    signature: null,
    stamp: null,
  }
  const sign = { dataUrl: 'data:image/png;base64,BBBB', width: 3, height: 1 }
  const issuedPayment = { ...emptyPaymentDetails(), instructions: 'Old bank' }

  it('uses what the invoice was issued with', () => {
    const images = { signatureId: 'S1', stampId: null }
    const withLogo = {
      ...northwind,
      issuedWith: { payment: issuedPayment, logoId: 'L1', ...images },
    }
    expect(issuedAssets(withLogo, { L1: logo, S1: sign }, current)).toEqual({
      payment: issuedPayment,
      logo,
      signature: sign,
      stamp: null,
    })

    const noLogo = {
      ...northwind,
      issuedWith: { payment: issuedPayment, logoId: null, signatureId: null, stampId: null },
    }
    expect(issuedAssets(noLogo, { L1: logo }, current)).toEqual({
      payment: issuedPayment,
      logo: null,
      signature: null,
      stamp: null,
    })
  })

  it('prints without a logo that has gone missing', () => {
    const lost = {
      ...northwind,
      issuedWith: { payment: issuedPayment, logoId: 'gone', signatureId: null, stampId: null },
    }
    expect(issuedAssets(lost, {}, current).logo).toBeNull()
  })

  it('falls back to the current details for invoices saved before they were kept', () => {
    expect(issuedAssets(northwind, {}, current)).toBe(current)
  })
})
