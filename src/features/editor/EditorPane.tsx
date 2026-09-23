import {
  Building2,
  CalendarDays,
  CircleCheck,
  FilePlus2,
  ListOrdered,
  Percent,
  QrCode,
  StickyNote,
  UserRound,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Collapsible } from '../../components/ui/Collapsible'
import { InlineConfirm } from '../../components/ui/InlineConfirm'
import { TextAreaField } from '../../components/ui/Field'
import { isPristineDraft } from '../../domain/draft'
import { draftState } from '../../domain/export'
import { formatDate } from '../../domain/format'
import { buildInvoiceViewModel } from '../../domain/viewModel'
import { cn } from '../../lib/cn'
import { useDraftStore, useHistoryStore } from '../../storage/stores'
import { BillToSection } from './sections/BillToSection'
import { FromSection } from './sections/FromSection'
import { InvoiceSection } from './sections/InvoiceSection'
import { LineItemsSection } from './sections/LineItemsSection'
import { PaymentSection } from './sections/PaymentSection'
import { TaxDiscountSection } from './sections/TaxDiscountSection'
import { sectionElementId } from './revealSection'
import { TotalsFooter } from './TotalsFooter'

type EditorPaneProps = {
  className?: string
  /** Opens the Business panel, where the profile and payment details live. */
  onEditProfile: () => void
}

/** The invoice being written. Every change is saved to this device as it's made. */
export function EditorPane({ className, onEditProfile }: EditorPaneProps) {
  const invoice = useDraftStore((state) => state.invoice)
  const update = useDraftStore((state) => state.updateInvoice)
  const startNewInvoice = useDraftStore((state) => state.startNewInvoice)
  const history = useHistoryStore((state) => state.entries)
  const [confirmingNew, setConfirmingNew] = useState(false)
  const newButton = useRef<HTMLButtonElement>(null)
  // All the numbers come from the calculation engine, recomputed once per change.
  const view = useMemo(() => (invoice ? buildInvoiceViewModel(invoice) : null), [invoice])

  if (!invoice || !view) {
    return (
      <Card
        className={cn('flex flex-col items-center justify-center gap-4 p-8 text-center', className)}
      >
        <h1 className="font-display text-xl font-semibold tracking-tight">No invoice open</h1>
        <Button variant="primary" onClick={() => startNewInvoice()}>
          <FilePlus2 />
          Start an invoice
        </Button>
      </Card>
    )
  }

  const state = draftState(invoice, history)

  function newInvoice() {
    // Nothing is lost if the draft is empty, or already saved in History exactly as it is.
    if (invoice && (isPristineDraft(invoice) || state === 'downloaded')) startNewInvoice()
    else setConfirmingNew(true)
  }

  const itemCount = invoice.items.length
  const discountMeta =
    invoice.discount.type === 'none'
      ? ''
      : invoice.discount.type === 'percent'
        ? ` · ${invoice.discount.value || 0}% off`
        : ' · discount'

  return (
    <Card className={cn('flex min-h-0 flex-col overflow-hidden', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-semibold tracking-tight">Invoice details</h1>
          <p className="flex items-center gap-1.5 text-sm text-fg-subtle">
            <CircleCheck className="size-3.5 text-accent" aria-hidden="true" />
            <span className="sm:hidden">Autosaved</span>
            <span className="hidden sm:inline">Saved automatically on this device</span>
          </p>
        </div>
        <Button ref={newButton} variant="ghost" size="sm" onClick={newInvoice}>
          <FilePlus2 />
          New invoice
        </Button>
      </div>

      {confirmingNew && (
        <InlineConfirm
          className="border-b border-line bg-accent-soft px-5 py-4"
          confirmLabel="Start new invoice"
          cancelLabel="Keep editing"
          returnFocus={newButton}
          onConfirm={() => {
            startNewInvoice()
            setConfirmingNew(false)
            newButton.current?.focus()
          }}
          onCancel={() => setConfirmingNew(false)}
        >
          <strong>Start a new invoice?</strong>{' '}
          {state === 'edited'
            ? 'Changes since your last download will be lost. The downloaded copy stays in History.'
            : 'This one will be cleared from the editor.'}
        </InlineConfirm>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3 sm:p-4">
        <Collapsible
          title="Bill to"
          id={sectionElementId('billTo')}
          icon={<UserRound />}
          meta={invoice.to.name || 'Not set'}
          defaultOpen
        >
          <BillToSection invoice={invoice} update={update} />
        </Collapsible>

        <Collapsible
          title="Items"
          id={sectionElementId('items')}
          icon={<ListOrdered />}
          meta={`${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
          defaultOpen
        >
          <LineItemsSection invoice={invoice} update={update} lines={view.lines} />
        </Collapsible>

        <Collapsible
          title="Tax & discounts"
          icon={<Percent />}
          meta={`${invoice.taxLabel || 'Tax'}${discountMeta}`}
        >
          <TaxDiscountSection invoice={invoice} update={update} />
        </Collapsible>

        <Collapsible
          title="Number, dates & currency"
          id={sectionElementId('invoice')}
          icon={<CalendarDays />}
          meta={`Due ${formatDate(invoice.dueDate, invoice.locale)}`}
        >
          <InvoiceSection invoice={invoice} update={update} />
        </Collapsible>

        <Collapsible
          title="From"
          id={sectionElementId('from')}
          icon={<Building2 />}
          meta={invoice.from.name || 'Not set'}
        >
          <FromSection invoice={invoice} update={update} onEditProfile={onEditProfile} />
        </Collapsible>

        <Collapsible title="Payment" icon={<QrCode />}>
          <PaymentSection onEditProfile={onEditProfile} />
        </Collapsible>

        <Collapsible title="Notes" icon={<StickyNote />} meta={invoice.notes.trim() ? 'Added' : ''}>
          <TextAreaField
            label="Notes to client"
            optional
            placeholder="Thank you for your business!"
            hint="Printed at the bottom of the invoice: thanks, terms or a reference."
            value={invoice.notes}
            onChange={(e) => update((inv) => ({ ...inv, notes: e.target.value }))}
          />
        </Collapsible>
      </div>

      <TotalsFooter rows={view.totals} />
    </Card>
  )
}
