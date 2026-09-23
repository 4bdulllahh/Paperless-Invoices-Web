import {
  CircleCheck,
  Copy,
  Download,
  History,
  LoaderCircle,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/Field'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { calculateTotals } from '../../domain/calc'
import { todayIso } from '../../domain/dates'
import { isPristineDraft } from '../../domain/draft'
import { draftState } from '../../domain/export'
import { formatDate, formatMoney } from '../../domain/format'
import {
  countByFilter,
  entryStatus,
  filterHistory,
  type EntryStatus,
  type HistoryFilter,
} from '../../domain/history'
import type { HistoryEntry } from '../../domain/records'
import { useHydrated } from '../../hooks/useHydrated'
import { cn } from '../../lib/cn'
import { useDraftStore, useHistoryStore } from '../../storage/stores'
import { validateDate } from '../editor/validators'
import { redownloadEntry } from '../export/downloadInvoice'

const FILTER_LABELS: Record<HistoryFilter, string> = {
  all: 'All',
  unpaid: 'Unpaid',
  overdue: 'Overdue',
  paid: 'Paid',
}

/** One inline form at a time: marking paid, confirming a delete, or replacing the draft. */
type Pending =
  | { kind: 'paid'; id: string; date: string }
  | { kind: 'delete'; id: string }
  | { kind: 'duplicate'; id: string }

/** Invoices downloaded so far: payment status, and download again, duplicate or delete. */
export function HistoryPanel({
  className,
  onOpenDraft,
}: {
  className?: string
  /** Called after an invoice is copied into a new draft, e.g. to go to the editor. */
  onOpenDraft: () => void
}) {
  const hydrated = useHydrated(useHistoryStore)
  const entries = useHistoryStore((state) => state.entries)
  const draft = useDraftStore((state) => state.invoice)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [pending, setPending] = useState<Pending | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const today = todayIso()

  const counts = useMemo(() => countByFilter(entries, today), [entries, today])
  const shown = useMemo(
    () => filterHistory(entries, { query, filter }, today),
    [entries, query, filter, today],
  )
  // Replacing the draft loses nothing if it's empty or saved in History exactly as it is.
  const draftIsSafe =
    !draft || isPristineDraft(draft) || draftState(draft, entries) === 'downloaded'

  async function downloadAgain(entry: HistoryEntry) {
    setDownloading(entry.id)
    setFailed(null)
    try {
      await redownloadEntry(entry)
    } catch (error) {
      console.error('[paperless] download failed', error)
      setFailed(entry.id)
    } finally {
      setDownloading(null)
    }
  }

  function duplicate(entry: HistoryEntry) {
    useDraftStore.getState().duplicateIntoDraft(entry.invoice)
    setPending(null)
    onOpenDraft()
  }

  return (
    <Card className={cn('flex min-h-0 flex-col overflow-hidden', className)}>
      <div className="border-b border-line px-5 py-4">
        <h1 className="font-display text-lg font-semibold tracking-tight">History</h1>
        <p className="text-sm text-fg-subtle">
          Every invoice you download is saved here, newest first.
        </p>
      </div>

      {hydrated && entries.length > 0 && (
        <div className="flex flex-col gap-3 border-b border-line px-5 py-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-fg-subtle"
              aria-hidden="true"
            />
            <TextField
              label="Search invoices"
              className="[&_input]:pl-10 [&>label]:sr-only"
              type="search"
              placeholder="Search by number or client"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <SegmentedControl
            label="Show"
            size="sm"
            className="flex w-full"
            value={filter}
            onChange={setFilter}
            options={(Object.keys(FILTER_LABELS) as HistoryFilter[]).map((value) => ({
              value,
              label: (
                <>
                  {FILTER_LABELS[value]}
                  <span className="tabular-nums opacity-70">{counts[value]}</span>
                </>
              ),
            }))}
          />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
        {!hydrated ? (
          <p className="p-4 text-sm text-fg-subtle">Loading history…</p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <span className="grid size-14 place-items-center rounded-lg bg-accent-soft text-accent">
              <History className="size-6" aria-hidden="true" />
            </span>
            <p className="font-display font-semibold">No invoices yet</p>
            <p className="max-w-xs text-sm text-fg-muted">
              When you download an invoice it’s saved here, so you can track payment and download it
              again later.
            </p>
          </div>
        ) : shown.length === 0 ? (
          <p className="p-4 text-sm text-fg-subtle">
            {query.trim()
              ? `No invoices match “${query.trim()}”.`
              : `No ${FILTER_LABELS[filter].toLowerCase()} invoices.`}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {shown.map((entry) => (
              <HistoryRow
                key={entry.id}
                entry={entry}
                status={entryStatus(entry, today)}
                pending={pending?.id === entry.id ? pending : null}
                setPending={setPending}
                today={today}
                downloading={downloading === entry.id}
                failed={failed === entry.id}
                onDownload={() => void downloadAgain(entry)}
                onDuplicate={() =>
                  draftIsSafe ? duplicate(entry) : setPending({ kind: 'duplicate', id: entry.id })
                }
                onConfirmDuplicate={() => duplicate(entry)}
              />
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

const STATUS_BADGES: Record<EntryStatus, { label: string; tone: 'neutral' | 'accent' }> = {
  paid: { label: 'Paid', tone: 'neutral' },
  unpaid: { label: 'Unpaid', tone: 'neutral' },
  overdue: { label: 'Overdue', tone: 'accent' },
}

type HistoryRowProps = {
  entry: HistoryEntry
  status: EntryStatus
  pending: Pending | null
  setPending: (pending: Pending | null) => void
  today: string
  downloading: boolean
  failed: boolean
  onDownload: () => void
  onDuplicate: () => void
  onConfirmDuplicate: () => void
}

function HistoryRow({
  entry,
  status,
  pending,
  setPending,
  today,
  downloading,
  failed,
  onDownload,
  onDuplicate,
  onConfirmDuplicate,
}: HistoryRowProps) {
  const { setStatus, removeEntry } = useHistoryStore.getState()
  const { invoice } = entry
  const total = useMemo(
    () => formatMoney(calculateTotals(invoice).total, invoice.currency, invoice.locale),
    [invoice],
  )
  const date = (iso: string) => formatDate(iso, invoice.locale)
  const badge = STATUS_BADGES[status]
  const clientName = invoice.to.name || 'No client'

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-line p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display font-semibold tabular-nums">{invoice.number}</p>
            <Badge tone={badge.tone} dot={status !== 'paid'}>
              {status === 'paid' && <CircleCheck className="size-3" aria-hidden="true" />}
              {badge.label}
            </Badge>
          </div>
          <p className="truncate text-sm text-fg-muted">{clientName}</p>
          <p className="text-xs text-fg-subtle">
            Issued {date(invoice.issueDate)} ·{' '}
            {status === 'paid' && entry.paidAt
              ? `Paid ${date(entry.paidAt)}`
              : `Due ${date(invoice.dueDate)}`}
          </p>
        </div>
        <p className="font-display font-semibold whitespace-nowrap tabular-nums">{total}</p>
      </div>

      {pending?.kind === 'paid' ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setStatus(entry.id, 'paid', pending.date)
            setPending(null)
          }}
        >
          <TextField
            label="Date paid"
            type="date"
            className="min-w-40 flex-1"
            value={pending.date}
            max={today}
            required
            onChange={(e) => {
              // Only complete dates are kept, so "Save" never stores half a date.
              if (!validateDate(e.target.value)) setPending({ ...pending, date: e.target.value })
            }}
          />
          <div className="flex gap-1.5">
            <Button size="sm" variant="primary" type="submit">
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : pending?.kind === 'delete' ? (
        <div
          role="alertdialog"
          aria-label={`Delete ${invoice.number}?`}
          className="flex flex-wrap items-center gap-2 rounded-md bg-accent-soft px-3 py-2 text-sm"
        >
          <p className="min-w-0 flex-1">
            Delete <strong>{invoice.number}</strong> from History? This can’t be undone.
          </p>
          <div className="flex gap-1.5">
            <Button size="sm" variant="danger" onClick={() => removeEntry(entry.id)}>
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : pending?.kind === 'duplicate' ? (
        <div
          role="alertdialog"
          aria-label="Replace the invoice you’re editing?"
          className="flex flex-wrap items-center gap-2 rounded-md bg-accent-soft px-3 py-2 text-sm"
        >
          <p className="min-w-0 flex-1">
            <strong>Replace the invoice you’re editing?</strong> Its unsaved changes will be lost.
          </p>
          <div className="flex gap-1.5">
            <Button size="sm" variant="danger" onClick={onConfirmDuplicate}>
              Replace
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          {status === 'paid' ? (
            <Button size="sm" onClick={() => setStatus(entry.id, 'unpaid')}>
              <RotateCcw />
              Mark unpaid
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setPending({ kind: 'paid', id: entry.id, date: today })}
            >
              <CircleCheck />
              Mark paid
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="px-3"
            disabled={downloading}
            aria-label={`Download ${invoice.number} again`}
            title="Download again"
            onClick={onDownload}
          >
            {downloading ? <LoaderCircle className="animate-spin" /> : <Download />}
            <span className="hidden sm:inline">Download</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="px-3"
            aria-label={`Duplicate ${invoice.number} as a new invoice`}
            title="Duplicate as a new invoice"
            onClick={onDuplicate}
          >
            <Copy />
            <span className="hidden sm:inline">Duplicate</span>
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            className="ml-auto size-9"
            aria-label={`Delete ${invoice.number}`}
            title="Delete"
            onClick={() => setPending({ kind: 'delete', id: entry.id })}
          >
            <Trash2 />
          </Button>
        </div>
      )}

      {failed && (
        <p role="alert" className="text-sm text-fg-muted">
          The PDF couldn’t be created. Please try again.
        </p>
      )}
    </li>
  )
}
