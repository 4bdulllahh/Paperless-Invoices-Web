import { Pencil } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { useProfileStore } from '../../../storage/stores'

/** How to pay, from the business profile. Shared by every invoice, so it's edited there. */
export function PaymentSection({ onEditProfile }: { onEditProfile: () => void }) {
  const payment = useProfileStore((state) => state.payment)
  const empty = !payment.instructions.trim() && !payment.link

  return (
    <div className="flex flex-col items-start gap-3">
      {empty ? (
        <p className="text-sm text-fg-muted">
          No payment details yet. Add bank details or a payment link so clients know how to pay.
        </p>
      ) : (
        <dl className="flex w-full flex-col gap-3 rounded-md bg-surface-muted p-3 text-sm">
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
        </dl>
      )}
      <Button size="sm" variant="ghost" className="-ml-2 h-8 px-3" onClick={onEditProfile}>
        <Pencil />
        {empty ? 'Add payment details' : 'Edit payment details'}
      </Button>
    </div>
  )
}
