import { ChoiceChips } from '../../components/ui/Checkbox'
import { CommitTextField } from '../../components/ui/CommitTextField'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field'
import { bicIssue, formatIban, ibanIssue, upiIdIssue } from '../../domain/paymentQr'
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  paymentLinkIssue,
  QR_METHODS,
  type PaymentDetails,
  type QrMethod,
} from '../../domain/records'
import { useProfileStore, useSettingsStore } from '../../storage/stores'

const METHOD_OPTIONS = PAYMENT_METHODS.map((value) => ({
  value,
  label: PAYMENT_METHOD_LABELS[value],
}))

const QR_LABELS: Record<QrMethod, string> = {
  link: 'Payment link',
  upi: 'UPI (INR invoices)',
  sepa: 'SEPA transfer (EUR invoices)',
  none: 'No QR code',
}

/** What the chosen QR code does, and when it won't appear. */
function qrHint(payment: PaymentDetails, currency: string): string {
  const currencyNote = (wanted: string) =>
    currency === wanted
      ? ''
      : ` Invoices in ${currency} won’t have one, so switch the currency on those that should.`
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

type PaymentDetailsFormProps = {
  payment: PaymentDetails
  onChange: (patch: Partial<PaymentDetails>) => void
  /** The currency invoices are in, to say when a QR code won't appear. */
  currency: string
}

/**
 * How clients pay: the methods accepted, bank details, instructions, a link and a QR code.
 * Saved as the user types; links and account numbers only once they're valid. Edits either the
 * business defaults or one invoice's own details, depending on where it's used.
 */
export function PaymentDetailsForm({ payment, onChange, currency }: PaymentDetailsFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <ChoiceChips
        legend="Payment methods you accept"
        hint={
          payment.methods.includes('cheque')
            ? 'Printed on invoices, with “Cheques payable to” your business name.'
            : 'Printed on invoices, e.g. “Accepted: Bank transfer · Card”.'
        }
        options={METHOD_OPTIONS}
        selected={payment.methods}
        onChange={(methods) => onChange({ methods })}
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1.5 text-sm font-medium text-fg-muted">Bank details</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Bank name"
            optional
            placeholder="Enter your bank’s name"
            autoComplete="off"
            value={payment.bankName}
            onChange={(e) => onChange({ bankName: e.target.value })}
          />
          <TextField
            label="Account name"
            optional
            placeholder="Name the account is held in"
            autoComplete="off"
            value={payment.accountName}
            onChange={(e) => onChange({ accountName: e.target.value })}
          />
          <TextField
            label="Account number"
            optional
            placeholder="Enter your account number"
            autoComplete="off"
            inputMode="numeric"
            spellCheck={false}
            value={payment.accountNumber}
            onChange={(e) => onChange({ accountNumber: e.target.value })}
          />
          <CommitTextField
            label="IBAN"
            optional
            placeholder="Enter your IBAN, e.g. AE07 0331 2345 6789 0123 456"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={payment.iban}
            validate={ibanIssue}
            onCommit={(iban) => onChange({ iban: iban.trim() && formatIban(iban) })}
          />
          <CommitTextField
            label="SWIFT / BIC"
            optional
            placeholder="e.g. EBILAEAD"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={payment.bic}
            validate={bicIssue}
            onCommit={(bic) => onChange({ bic: bic.trim().toUpperCase() })}
          />
        </div>
      </fieldset>

      <TextAreaField
        label="Other payment instructions"
        optional
        rows={3}
        placeholder="e.g. Please quote the invoice number as the payment reference."
        hint="Printed under your bank details."
        value={payment.instructions}
        onChange={(e) => onChange({ instructions: e.target.value })}
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
        onCommit={(link) => onChange({ link: link.trim() })}
      />
      <SelectField
        label="QR code on invoices"
        hint={qrHint(payment, currency)}
        value={payment.qr}
        onChange={(e) => onChange({ qr: e.target.value as QrMethod })}
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
          onCommit={(upiId) => onChange({ upiId: upiId.trim() })}
        />
      )}
      {payment.qr === 'sepa' && !payment.iban && (
        <p className="text-sm text-fg-muted">Add your IBAN under Bank details for a SEPA code.</p>
      )}
    </div>
  )
}

/** The business's default payment details, which every new invoice starts with. */
export function DefaultPaymentDetailsForm() {
  const payment = useProfileStore((state) => state.payment)
  const updatePayment = useProfileStore((state) => state.updatePayment)
  const currency = useSettingsStore((state) => state.currency)
  return <PaymentDetailsForm payment={payment} onChange={updatePayment} currency={currency} />
}
