import { Card } from '../../components/ui/Card'
import { CheckboxField } from '../../components/ui/Checkbox'
import { cn } from '../../lib/cn'
import { useSettingsStore } from '../../storage/stores'
import { BusinessDetailsForm } from './BusinessDetailsForm'
import { DefaultPaymentDetailsForm } from './PaymentDetailsForm'
import { SignatureFields } from './SignatureFields'

export function BusinessPanel({ className }: { className?: string }) {
  const signInvoices = useSettingsStore((state) => state.signInvoices)
  const updateSettings = useSettingsStore((state) => state.updateSettings)
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
          <DefaultPaymentDetailsForm />
        </section>
        <section
          aria-labelledby="signature-heading"
          className="flex flex-col gap-4 border-t border-line pt-6"
        >
          <h2
            id="signature-heading"
            className="font-display text-base font-semibold tracking-tight"
          >
            Signature & stamp
          </h2>
          <SignatureFields />
          <CheckboxField
            label="Sign new invoices"
            hint="Prints your signature and stamp over “Authorised signature”, or a line to sign on."
            checked={signInvoices}
            onChange={(e) => updateSettings({ signInvoices: e.target.checked })}
          />
        </section>
      </div>
    </Card>
  )
}
