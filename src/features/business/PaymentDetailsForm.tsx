import { CommitTextField } from '../../components/ui/CommitTextField'
import { SelectField, TextAreaField } from '../../components/ui/Field'
import { bicIssue, formatIban, ibanIssue, upiIdIssue } from '../../domain/paymentQr'
import {
  paymentLinkIssue,
  QR_METHODS,
  type PaymentDetails,
  type QrMethod,
} from '../../domain/records'
import { useProfileStore, useSettingsStore } from '../../storage/stores'

const QR_LABELS: Record<QrMethod, string> = {
  link: 'Payment link',
  upi: 'UPI (INR invoices)',
  sepa: 'SEPA transfer (EUR invoices)',
  none: 'No QR code',
}

/** What the chosen QR code does, and when it won't appear. */
function qrHint(payment: PaymentDetails, defaultCurrency: string): string {
  const currencyNote = (currency: string) =>
    defaultCurrency === currency
      ? ''
      : ` Your default currency is ${defaultCurrency}, so switch the currency on invoices that should have one.`
  switch (payment.qr) {
    case 'link':
      return payment.link
        ? 'Clients scan it to open your payment link.'
        : 'Add a payment link above to print it as a QR code.'
    case 'upi':
      return `Any UPI app opens it with the amount and invoice number filled in. Added to invoices in INR.${currencyNote('INR')}`
    case 'sepa':
      return `Also called a GiroCode. European banking apps fill in your IBAN, the amount and the invoice number. Added to invoices in EUR.${currencyNote('EUR')}`
    case 'none':
      return 'Invoices won’t have a QR code.'
  }
}

/** How clients pay. Saved as the user types; links and account details only once they're valid. */
export function PaymentDetailsForm() {
  const payment = useProfileStore((state) => state.payment)
  const updatePayment = useProfileStore((state) => state.updatePayment)
  const defaultCurrency = useSettingsStore((state) => state.currency)

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
        hint="A PayPal, Stripe or Wise link, printed on invoices."
        value={payment.link}
        validate={paymentLinkIssue}
        onCommit={(link) => updatePayment({ link: link.trim() })}
      />
      <SelectField
        label="QR code on invoices"
        hint={qrHint(payment, defaultCurrency)}
        value={payment.qr}
        onChange={(e) => updatePayment({ qr: e.target.value as QrMethod })}
      >
        {QR_METHODS.map((method) => (
          <option key={method} value={method}>
            {QR_LABELS[method]}
          </option>
        ))}
      </SelectField>
      {payment.qr === 'upi' && (
        <CommitTextField
          label="UPI ID"
          placeholder="acmestudio@okhdfcbank"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={payment.upiId}
          validate={upiIdIssue}
          onCommit={(upiId) => updatePayment({ upiId: upiId.trim() })}
        />
      )}
      {payment.qr === 'sepa' && (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
          <CommitTextField
            label="IBAN"
            placeholder="DE89 3704 0044 0532 0130 00"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={payment.iban}
            validate={ibanIssue}
            onCommit={(iban) => updatePayment({ iban: iban.trim() && formatIban(iban) })}
          />
          <CommitTextField
            label="BIC"
            optional
            placeholder="COBADEFFXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={payment.bic}
            validate={bicIssue}
            onCommit={(bic) => updatePayment({ bic: bic.trim().toUpperCase() })}
          />
        </div>
      )}
    </div>
  )
}
