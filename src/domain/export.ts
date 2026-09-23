import { z } from 'zod'
import { sameData } from './equal'
import { formatInvoiceNumber } from './numbering'
import type { HistoryEntry, Settings } from './records'
import type { Invoice } from './schema'

/**
 * Downloading an invoice: what must be filled in first, which number it uses up, what the file
 * is called, and whether the draft still matches what was downloaded.
 */

/** Editor sections an issue points to, in the order they appear in the editor. */
export const EXPORT_SECTIONS = ['billTo', 'items', 'invoice', 'from'] as const
export type ExportSection = (typeof EXPORT_SECTIONS)[number]

export type ExportIssue = {
  section: ExportSection
  message: string
  /** Something the law asks for: a warning the user may download past, not a blocker. */
  legal?: boolean
}

const isoDate = z.iso.date()
const normalizeNumber = (number: string) => number.trim().toLocaleLowerCase()

/** Another downloaded invoice with this number, if any. */
export function findNumberClash(
  invoice: Invoice,
  history: readonly HistoryEntry[],
): HistoryEntry | undefined {
  const wanted = normalizeNumber(invoice.number)
  if (!wanted) return undefined
  return history.find(
    (entry) => entry.invoice.id !== invoice.id && normalizeNumber(entry.invoice.number) === wanted,
  )
}

/**
 * Everything that stops an invoice from being downloaded, in editor order. Empty when it's ready.
 * Numbers already used by other invoices in History are refused, so no two share a number.
 */
export function exportIssues(invoice: Invoice, history: readonly HistoryEntry[]): ExportIssue[] {
  const issues: ExportIssue[] = []

  if (!invoice.to.name.trim()) {
    issues.push({ section: 'billTo', message: 'Add who the invoice is for.' })
  }

  const hasPrice = (price: string) => price.trim() !== ''
  const hasDescription = (description: string) => description.trim() !== ''
  if (!invoice.items.some((item) => hasDescription(item.description) && hasPrice(item.unitPrice))) {
    issues.push({
      section: 'items',
      message: 'Add at least one item with a description and price.',
    })
  }
  invoice.items.forEach((item, i) => {
    if (hasPrice(item.unitPrice) && !hasDescription(item.description)) {
      issues.push({ section: 'items', message: `Item ${i + 1} has a price but no description.` })
    }
  })

  if (!invoice.number.trim()) {
    issues.push({ section: 'invoice', message: 'Give the invoice a number.' })
  } else if (findNumberClash(invoice, history)) {
    issues.push({
      section: 'invoice',
      message: `${invoice.number.trim()} is already used by an invoice in History.`,
    })
  }
  const issueDateValid = isoDate.safeParse(invoice.issueDate).success
  const dueDateValid = isoDate.safeParse(invoice.dueDate).success
  if (!issueDateValid) issues.push({ section: 'invoice', message: 'Choose an issue date.' })
  if (!dueDateValid) issues.push({ section: 'invoice', message: 'Choose a due date.' })
  if (issueDateValid && dueDateValid && invoice.dueDate < invoice.issueDate) {
    issues.push({ section: 'invoice', message: 'The due date is before the issue date.' })
  }

  if (!invoice.from.name.trim()) {
    issues.push({ section: 'from', message: 'Add your business name.' })
  }

  return issues
}

/**
 * Whether downloading this invoice uses up the next sequence number. Only a first download does,
 * and only while the invoice still carries the number it was given (not one typed by hand).
 * The number was formatted from the date the draft was started, which may since have changed.
 */
export function claimsNextNumber(
  invoice: Invoice,
  settings: Pick<Settings, 'numberPattern' | 'nextSequence'>,
  history: readonly HistoryEntry[],
  today: string,
): boolean {
  if (history.some((entry) => entry.invoice.id === invoice.id)) return false
  const number = invoice.number.trim()
  return [invoice.issueDate, today].some(
    (date) => formatInvoiceNumber(settings.numberPattern, settings.nextSequence, date) === number,
  )
}

/** Characters Windows or macOS refuse in file names, plus control characters. */
const UNSAFE_FILE_CHARS = /[\\/:*?"<>|\p{Cc}]/gu
export const MAX_FILE_NAME_LENGTH = 120

/** e.g. "Invoice INV-2026-0042 - Northwind Ltd.pdf", safe to save on any system. */
export function invoiceFileName(invoice: Pick<Invoice, 'number' | 'to'>): string {
  const clean = (text: string) => text.replace(UNSAFE_FILE_CHARS, ' ').replace(/\s+/g, ' ').trim()
  const base = [`Invoice ${clean(invoice.number)}`.trim(), clean(invoice.to.name)]
    .filter(Boolean)
    .join(' - ')
  // Cut by characters, not UTF-16 units, so an emoji is never split in half. Windows also
  // refuses names that end in a dot or space.
  const capped = [...base]
    .slice(0, MAX_FILE_NAME_LENGTH)
    .join('')
    .replace(/[\s.]+$/, '')
  return `${capped}.pdf`
}

/**
 * Where the draft stands: never downloaded, downloaded and unchanged since, or edited after
 * downloading (downloading again replaces the saved copy).
 */
export type DraftState = 'draft' | 'downloaded' | 'edited'

export function draftState(invoice: Invoice, history: readonly HistoryEntry[]): DraftState {
  const entry = history.find((e) => e.invoice.id === invoice.id)
  if (!entry) return 'draft'
  return sameData(entry.invoice, invoice) ? 'downloaded' : 'edited'
}
