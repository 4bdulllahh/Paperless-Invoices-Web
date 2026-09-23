import { describe, expect, it } from 'vitest'
import { createLineItem, emptyParty } from './draft'
import {
  claimsNextNumber,
  draftState,
  exportIssues,
  findNumberClash,
  invoiceFileName,
  MAX_FILE_NAME_LENGTH,
} from './export'
import type { HistoryEntry } from './records'
import { createSampleInvoice } from './sample'
import type { Invoice } from './schema'

const entryFor = (invoice: Invoice): HistoryEntry => ({
  id: `entry-${invoice.id}`,
  invoice: structuredClone(invoice),
  issuedWith: null,
  savedAt: '2026-09-23T10:00:00.000Z',
  status: 'unpaid',
  paidAt: null,
})

describe('exportIssues', () => {
  it('finds nothing wrong with a complete invoice', () => {
    expect(exportIssues(createSampleInvoice(), [])).toEqual([])
  })

  it('lists everything missing, in editor order', () => {
    const empty = createSampleInvoice({
      number: '  ',
      from: emptyParty(),
      to: emptyParty(),
      items: [createLineItem('line')],
    })
    expect(exportIssues(empty, [])).toEqual([
      { section: 'billTo', message: 'Add who the invoice is for.' },
      { section: 'items', message: 'Add at least one item with a description and price.' },
      { section: 'invoice', message: 'Give the invoice a number.' },
      { section: 'from', message: 'Add your business name.' },
    ])
  })

  it('points out priced items without a description', () => {
    const invoice = createSampleInvoice()
    invoice.items[1] = { ...invoice.items[1], description: '  ' }
    expect(exportIssues(invoice, [])).toEqual([
      { section: 'items', message: 'Item 2 has a price but no description.' },
    ])
  })

  it('needs an item with both a description and a price', () => {
    const invoice = createSampleInvoice({
      items: [{ ...createLineItem('a'), description: 'Consulting' }],
    })
    expect(exportIssues(invoice, []).map((i) => i.section)).toEqual(['items'])
  })

  it('checks the dates', () => {
    const dueEarly = createSampleInvoice({ issueDate: '2026-09-23', dueDate: '2026-09-22' })
    expect(exportIssues(dueEarly, [])).toEqual([
      { section: 'invoice', message: 'The due date is before the issue date.' },
    ])
    const invalid = createSampleInvoice({ issueDate: '2026-02-30', dueDate: '' })
    expect(exportIssues(invalid, []).map((i) => i.message)).toEqual([
      'Choose an issue date.',
      'Choose a due date.',
    ])
  })

  it('refuses a number another invoice in History already uses', () => {
    const issued = createSampleInvoice({ id: 'issued', number: 'INV-2026-0042' })
    const clash = createSampleInvoice({ id: 'new', number: ' inv-2026-0042 ' })
    expect(exportIssues(clash, [entryFor(issued)])).toEqual([
      { section: 'invoice', message: 'inv-2026-0042 is already used by an invoice in History.' },
    ])
    // Downloading the same invoice again is fine.
    expect(exportIssues(issued, [entryFor(issued)])).toEqual([])
  })
})

describe('findNumberClash', () => {
  it('ignores empty numbers', () => {
    const blank = createSampleInvoice({ id: 'a', number: '' })
    expect(findNumberClash(createSampleInvoice({ number: '' }), [entryFor(blank)])).toBeUndefined()
  })
})

describe('claimsNextNumber', () => {
  const settings = { numberPattern: 'INV-{YYYY}-{####}', nextSequence: 5 }
  const invoice = createSampleInvoice({ number: 'INV-2026-0005', issueDate: '2026-09-23' })

  it('claims on the first download of an invoice still carrying the next number', () => {
    expect(claimsNextNumber(invoice, settings, [], '2026-09-23')).toBe(true)
  })

  it('still claims after the issue date moved to another year', () => {
    const moved = { ...invoice, issueDate: '2027-01-04' }
    expect(claimsNextNumber(moved, settings, [], '2026-09-23')).toBe(true)
  })

  it('doesn’t claim for numbers typed by hand', () => {
    const typed = { ...invoice, number: 'ACME-17' }
    expect(claimsNextNumber(typed, settings, [], '2026-09-23')).toBe(false)
  })

  it('doesn’t claim again when re-downloading', () => {
    expect(claimsNextNumber(invoice, settings, [entryFor(invoice)], '2026-09-23')).toBe(false)
  })
})

describe('invoiceFileName', () => {
  it('names the file after the number and client', () => {
    expect(invoiceFileName(createSampleInvoice())).toBe('Invoice INV-2026-0042 - Northwind Ltd.pdf')
  })

  it('leaves out a missing client or number', () => {
    expect(invoiceFileName({ number: 'INV-1', to: emptyParty() })).toBe('Invoice INV-1.pdf')
    expect(invoiceFileName({ number: '', to: { ...emptyParty(), name: 'Contoso' } })).toBe(
      'Invoice - Contoso.pdf',
    )
  })

  it('removes characters Windows and macOS refuse', () => {
    const to = { ...emptyParty(), name: 'A/B: "Test" <Co>|*?\\ \n Ltd.' }
    expect(invoiceFileName({ number: '2026/01', to })).toBe('Invoice 2026 01 - A B Test Co Ltd.pdf')
  })

  it('caps the length without splitting characters', () => {
    const to = { ...emptyParty(), name: '😀'.repeat(200) }
    const name = invoiceFileName({ number: 'INV-1', to })
    expect([...name.replace(/\.pdf$/, '')]).toHaveLength(MAX_FILE_NAME_LENGTH)
    expect(name.endsWith('😀.pdf')).toBe(true)
  })

  it('never ends the name in a dot or space before the extension', () => {
    const to = { ...emptyParty(), name: `${'x'.repeat(MAX_FILE_NAME_LENGTH - 20)} . .` }
    expect(invoiceFileName({ number: 'INV-1', to })).toMatch(/x\.pdf$/)
  })
})

describe('draftState', () => {
  const invoice = createSampleInvoice()

  it('is a draft until downloaded', () => {
    expect(draftState(invoice, [])).toBe('draft')
  })

  it('is downloaded while it matches History, and edited once it doesn’t', () => {
    const history = [entryFor(invoice)]
    expect(draftState({ ...invoice }, history)).toBe('downloaded')
    expect(draftState({ ...invoice, notes: 'Changed' }, history)).toBe('edited')
  })
})
