import { Card } from '../../components/ui/Card'
import { cn } from '../../lib/cn'
import { BusinessDetailsForm } from './BusinessDetailsForm'
import { PaymentDetailsForm } from './PaymentDetailsForm'

export function BusinessPanel({ className }: { className?: string }) {
  return (
    <Card className={cn('flex min-h-0 flex-col overflow-hidden', className)}>
      <div className="border-b border-line px-5 py-4">
        <h1 className="font-display text-lg font-semibold tracking-tight">Business</h1>
        <p className="text-sm text-fg-subtle">
          Who your invoices are from. Saved automatically on this device.
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto overscroll-contain p-5">
        <section aria-labelledby="business-details-heading" className="flex flex-col gap-4">
          <h2
            id="business-details-heading"
            className="font-display text-base font-semibold tracking-tight"
          >
            Details
          </h2>
          <BusinessDetailsForm showRequired />
        </section>
        <section
          aria-labelledby="getting-paid-heading"
          className="flex flex-col gap-4 border-t border-line pt-6"
        >
          <h2
            id="getting-paid-heading"
            className="font-display text-base font-semibold tracking-tight"
          >
            Getting paid
          </h2>
          <PaymentDetailsForm />
        </section>
      </div>
    </Card>
  )
}
