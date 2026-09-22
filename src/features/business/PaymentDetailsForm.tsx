import { CommitTextField } from '../../components/ui/CommitTextField'
import { TextAreaField } from '../../components/ui/Field'
import { paymentLinkIssue } from '../../domain/records'
import { useProfileStore } from '../../storage/stores'

/** How clients pay. Saved as the user types; the link is only saved once it's valid. */
export function PaymentDetailsForm() {
  const payment = useProfileStore((state) => state.payment)
  const updatePayment = useProfileStore((state) => state.updatePayment)

  return (
    <div className="flex flex-col gap-4">
      <TextAreaField
        label="Payment instructions"
        optional
        rows={4}
        placeholder={
          'Bank: Example Bank\nAccount name: Acme Studio LLC\nIBAN: GB00 0000 0000 0000 0000 00'
        }
        hint="Printed on every invoice, e.g. your bank details."
        value={payment.instructions}
        onChange={(e) => updatePayment({ instructions: e.target.value })}
      />
      <CommitTextField
        label="Payment link"
        optional
        type="url"
        inputMode="url"
        placeholder="https://pay.example.com/acme-studio"
        hint="A PayPal, Stripe or Wise link. Added to invoices as a QR code clients can scan."
        value={payment.link}
        validate={paymentLinkIssue}
        onCommit={(link) => updatePayment({ link: link.trim() })}
      />
    </div>
  )
}
