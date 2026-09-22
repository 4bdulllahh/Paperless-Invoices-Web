import { ChevronUp } from 'lucide-react'
import { useId, useState } from 'react'
import type { TotalRow } from '../../domain/viewModel'
import { cn } from '../../lib/cn'

/** Balance due, always visible; the full breakdown opens above it. */
export function TotalsFooter({ rows }: { rows: TotalRow[] }) {
  const [open, setOpen] = useState(false)
  const breakdownId = useId()
  const balance = rows.find((row) => row.kind === 'balance')!
  const breakdown = rows.filter((row) => row.kind !== 'balance')

  return (
    <div className="border-t border-line bg-surface-muted">
      {open && (
        <dl
          id={breakdownId}
          className="flex flex-col gap-1.5 border-b border-line px-5 py-3 text-sm"
        >
          {breakdown.map((row) => (
            <div
              key={`${row.kind}-${row.label}`}
              className={cn(
                'flex justify-between gap-4',
                row.kind === 'total' && 'mt-1 border-t border-line pt-2 font-semibold',
              )}
            >
              <dt className={row.kind === 'total' ? 'text-fg' : 'text-fg-muted'}>{row.label}</dt>
              <dd className="tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={breakdownId}
          onClick={() => setOpen(!open)}
          className="-ml-2 flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-fg-muted hover:bg-surface-sunken hover:text-fg"
        >
          {balance.label}
          <ChevronUp
            className={cn('size-4 transition-transform duration-200', !open && 'rotate-180')}
            aria-hidden="true"
          />
          <span className="sr-only">{open ? 'Hide breakdown' : 'Show breakdown'}</span>
        </button>
        <span className="font-display text-xl font-semibold tabular-nums" aria-live="polite">
          {balance.value}
        </span>
      </div>
    </div>
  )
}
