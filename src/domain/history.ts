import { isOverdue } from './dates'
import type { HistoryEntry, Logo, PrintAssets } from './records'

/** Downloaded invoices: payment status, search and filters for the History panel. */

export type EntryStatus = 'paid' | 'unpaid' | 'overdue'
export const HISTORY_FILTERS = ['all', 'unpaid', 'overdue', 'paid'] as const
export type HistoryFilter = (typeof HISTORY_FILTERS)[number]

/** Unpaid invoices past their due date are overdue. */
export function entryStatus(entry: HistoryEntry, today: string): EntryStatus {
  if (entry.status === 'paid') return 'paid'
  return isOverdue(entry.invoice.dueDate, today) ? 'overdue' : 'unpaid'
}

function matchesFilter(status: EntryStatus, filter: HistoryFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'unpaid':
      // Overdue invoices are unpaid too.
      return status !== 'paid'
    default:
      return status === filter
  }
}

const normalize = (text: string) => text.trim().toLocaleLowerCase()

/** Entries in the chosen filter whose number, client name or client email contains the query. */
export function filterHistory(
  entries: readonly HistoryEntry[],
  { query, filter }: { query: string; filter: HistoryFilter },
  today: string,
): HistoryEntry[] {
  const q = normalize(query)
  return entries.filter((entry) => {
    if (!matchesFilter(entryStatus(entry, today), filter)) return false
    const { number, to } = entry.invoice
    return !q || [number, to.name, to.email].some((text) => normalize(text).includes(q))
  })
}

/** How many entries each filter shows. */
export function countByFilter(
  entries: readonly HistoryEntry[],
  today: string,
): Record<HistoryFilter, number> {
  const counts: Record<HistoryFilter, number> = { all: 0, unpaid: 0, overdue: 0, paid: 0 }
  for (const entry of entries) {
    const status = entryStatus(entry, today)
    for (const filter of HISTORY_FILTERS) if (matchesFilter(status, filter)) counts[filter]++
  }
  return counts
}

/**
 * The payment details and images to print a saved invoice with: those it was issued with, or
 * the current ones for invoices saved before they were kept.
 */
export function issuedAssets(
  entry: HistoryEntry,
  logos: Readonly<Record<string, Logo>>,
  current: PrintAssets,
): PrintAssets {
  if (!entry.issuedWith) return current
  const { payment, logoId, signatureId, stampId } = entry.issuedWith
  const image = (id: string | null) => (id ? (logos[id] ?? null) : null)
  return { payment, logo: image(logoId), signature: image(signatureId), stamp: image(stampId) }
}
