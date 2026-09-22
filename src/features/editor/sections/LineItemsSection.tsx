import { Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { createLineItem } from '../../../domain/draft'
import {
  addLineItem,
  duplicateLineItem,
  moveLineItem,
  removeLineItem,
  updateLineItem,
} from '../../../domain/lineItems'
import type { Invoice } from '../../../domain/schema'
import type { LineView } from '../../../domain/viewModel'
import { useSettingsStore } from '../../../storage/stores'
import { LineItemRow } from './LineItemRow'
import type { InvoiceUpdater } from './types'

type LineItemsSectionProps = {
  invoice: Invoice
  update: InvoiceUpdater
  /** Formatted lines from the view model, in the same order as invoice.items. */
  lines: LineView[]
}

export function LineItemsSection({ invoice, update, lines }: LineItemsSectionProps) {
  const defaultTaxRate = useSettingsStore((state) => state.defaultTaxRate)
  const addButton = useRef<HTMLButtonElement>(null)
  // The line that should take focus when it appears (newly added or duplicated).
  const [focusId, setFocusId] = useState<string | null>(null)

  function addLine() {
    const id = crypto.randomUUID()
    update((inv) => addLineItem(inv, createLineItem(id, defaultTaxRate)))
    setFocusId(id)
  }

  return (
    <div className="flex flex-col gap-3">
      {invoice.items.length === 0 && (
        <p className="rounded-lg border border-dashed border-line-strong p-4 text-center text-sm text-fg-subtle">
          No items yet. Add what you’re charging for.
        </p>
      )}
      {invoice.items.map((item, index) => (
        <LineItemRow
          key={item.id}
          item={item}
          index={index}
          count={invoice.items.length}
          locale={invoice.locale}
          amount={lines[index]?.amount ?? ''}
          autoFocus={item.id === focusId}
          onChange={(patch) => update((inv) => updateLineItem(inv, item.id, patch))}
          onMove={(direction) => update((inv) => moveLineItem(inv, item.id, direction))}
          onDuplicate={() => {
            const id = crypto.randomUUID()
            update((inv) => duplicateLineItem(inv, item.id, id))
            setFocusId(id)
          }}
          onRemove={() => {
            update((inv) => removeLineItem(inv, item.id))
            // The row and its buttons are gone; keep keyboard focus somewhere sensible.
            addButton.current?.focus()
          }}
          onEnter={() => {
            if (index === invoice.items.length - 1) addLine()
          }}
        />
      ))}
      <Button
        ref={addButton}
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={addLine}
      >
        <Plus />
        Add item
      </Button>
    </div>
  )
}
