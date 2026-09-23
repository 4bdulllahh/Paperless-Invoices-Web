import { Pencil } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '../../../components/ui/Button'
import { invoicePaymentQr } from '../../../domain/paymentQr'
import { PAYMENT_METHOD_LABELS } from '../../../domain/records'
import { useDraftStore, useProfileStore } from '../../../storage/stores'

/**
 * How to pay, from the business profile. Shared by every invoice, so it's edited there. Also
 * says whether this invoice gets a QR code, and why not when it doesn't.
 */
export function PaymentSection({ onEditProfile }: { onEditProfile: () => void }) {
  const payment = useProfileStore((state) => state.payment)
  const invoice = useDraftStore((state) => state.invoice)
  const qr = useMemo(
    () => (invoice ? invoicePaymentQr(payment, invoice) : { status: 'off' as const }),
    [payment, invoice],
  )
  const empty =
    !payment.instructions.trim() &&
    !payment.link &&
    qr.status === 'off' &&
    payment.methods.length === 0

  return (
    <div className="flex flex-col items-start gap-3">
      {empty ? (
        <p className="text-sm text-fg-muted">
          No payment details yet. Add the methods you accept, bank details, a payment link or a QR
          code so clients know how to pay.
        </p>
      ) : (
        <dl className="flex w-full flex-col gap-3 rounded-md bg-surface-muted p-3 text-sm">
          {payment.methods.length > 0 && (
            <div>
              <dt className="text-xs font-medium text-fg-subtle">Accepted</dt>
              <dd>{payment.methods.map((m) => PAYMENT_METHOD_LABELS[m]).join(' · ')}</dd>
            </div>
          )}
          {payment.instructions.trim() && (
            <div>
              <dt className="text-xs font-medium text-fg-subtle">Instructions</dt>
              <dd className="whitespace-pre-line">{payment.instructions.trim()}</dd>
            </div>
          )}
          {payment.link && (
            <div>
              <dt className="text-xs font-medium text-fg-subtle">Payment link</dt>
              <dd className="break-all">{payment.link}</dd>
            </div>
          )}
          {qr.status !== 'off' && (
            <div>
              <dt className="text-xs font-medium text-fg-subtle">QR code</dt>
              {qr.status === 'ready' ? (
                <dd>
                  {qr.qr.title}
                  <span className="block text-fg-muted">{qr.qr.detail}</span>
                </dd>
              ) : (
                <dd className="text-fg-muted">{qr.reason}</dd>
              )}
            </div>
          )}
        </dl>
      )}
      <Button size="sm" variant="ghost" className="-ml-2 h-8 px-3" onClick={onEditProfile}>
        <Pencil />
        {empty ? 'Add payment details' : 'Edit payment details'}
      </Button>
    </div>
  )
}
