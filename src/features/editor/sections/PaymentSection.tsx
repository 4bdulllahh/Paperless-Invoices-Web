import { CircleCheck, Info, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { invoicePaymentQr } from '../../../domain/paymentQr'
import type { Invoice, PaymentDetails } from '../../../domain/schema'
import { useProfileStore } from '../../../storage/stores'
import { PaymentDetailsForm } from '../../business/PaymentDetailsForm'
import type { InvoiceUpdater } from './types'

/**
 * How this invoice gets paid. It starts with the business defaults; changes made here belong to
 * this invoice alone, so the defaults (edited in Business) stay as they were and the next new
 * invoice starts from them again.
 */
export function PaymentSection({ invoice, update }: { invoice: Invoice; update: InvoiceUpdater }) {
  const defaults = useProfileStore((state) => state.payment)
  const payment = invoice.payment ?? defaults
  const custom = invoice.payment !== null
  // Shown after the first change, so the user knows their defaults weren't touched.
  const [notice, setNotice] = useState(false)
  const qr = useMemo(() => invoicePaymentQr(payment, invoice), [payment, invoice])

  function change(patch: Partial<PaymentDetails>) {
    if (!custom) setNotice(true)
    update((inv) => ({ ...inv, payment: { ...(inv.payment ?? defaults), ...patch } }))
  }

  function resetToDefaults() {
    setNotice(false)
    update((inv) => ({ ...inv, payment: null }))
  }

  return (
    <div className="flex flex-col gap-4">
      {custom ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-accent-soft px-3 py-2 text-sm">
          <span>Changed for this invoice only.</span>
          <Button size="sm" variant="ghost" className="-my-1 h-8 px-3" onClick={resetToDefaults}>
            <RotateCcw />
            Use my defaults
          </Button>
        </div>
      ) : (
        <p className="rounded-md bg-surface-muted px-3 py-2 text-sm text-fg-muted">
          Your default payment details. Changes here only apply to this invoice.
        </p>
      )}

      <PaymentDetailsForm payment={payment} onChange={change} currency={invoice.currency} />

      {qr.status === 'unavailable' && (
        <p className="flex items-start gap-2 text-sm text-fg-muted">
          <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          {qr.reason}
        </p>
      )}

      {notice && custom && (
        <div
          role="status"
          className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-lg border border-accent bg-surface p-4 text-sm shadow-elev-2"
        >
          <p className="flex items-start gap-2.5">
            <CircleCheck className="mt-0.5 size-4.5 shrink-0 text-accent" aria-hidden="true" />
            <span>
              <strong className="font-semibold">You changed the payment details</strong> for this
              invoice only. Your default payment details stay the same, and your next new invoice
              will use them.
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={() => setNotice(false)}>
              Got it
            </Button>
            <Button size="sm" variant="ghost" onClick={resetToDefaults}>
              <RotateCcw />
              Undo changes
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
