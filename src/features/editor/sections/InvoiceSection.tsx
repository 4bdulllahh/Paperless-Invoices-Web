import { useMemo } from 'react'
import { CheckboxField } from '../../../components/ui/Checkbox'
import { SelectField, TextField } from '../../../components/ui/Field'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { addDays, daysBetween } from '../../../domain/dates'
import { currencyOptions, paymentTermsOptions } from '../../../domain/options'
import type { DueMode, Invoice } from '../../../domain/schema'
import { validateDate } from '../validators'
import type { InvoiceUpdater } from './types'

const DUE_MODES = [
  { value: 'date', label: 'Due date' },
  { value: 'terms', label: 'Payment terms' },
] as const satisfies readonly { value: DueMode; label: string }[]

/** Where a client's purchase order is a "Local Purchase Order". */
const LPO_COUNTRIES = new Set(['AE', 'SA', 'BH', 'OM', 'QA', 'KW'])

/** Title, number, dates, terms, purchase order and currency. */
export function InvoiceSection({ invoice, update }: { invoice: Invoice; update: InvoiceUpdater }) {
  const currencies = useMemo(() => currencyOptions(invoice.locale), [invoice.locale])
  const dueBeforeIssue = invoice.dueMode === 'date' && invoice.dueDate < invoice.issueDate
  const terms = invoice.dueMode === 'terms'

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Title"
          placeholder="Invoice"
          value={invoice.title}
          onChange={(e) => update((inv) => ({ ...inv, title: e.target.value }))}
        />
        <TextField
          label="Invoice number"
          spellCheck={false}
          value={invoice.number}
          onChange={(e) => update((inv) => ({ ...inv, number: e.target.value }))}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Issue date"
          type="date"
          value={invoice.issueDate}
          onChange={(e) => {
            const issueDate = e.target.value
            // An empty or partial date must never be saved: the whole draft would fail validation.
            if (validateDate(issueDate)) return
            // Keep the payment terms: move the due date along with the issue date.
            update((inv) => ({
              ...inv,
              issueDate,
              dueDate: addDays(issueDate, daysBetween(inv.issueDate, inv.dueDate)),
            }))
          }}
        />
        <TextField
          label="Date of supply"
          optional
          type="date"
          hint="Only if the goods or services were supplied on another day."
          value={invoice.supplyDate}
          onChange={(e) => {
            const supplyDate = e.target.value
            if (!supplyDate || !validateDate(supplyDate)) update((inv) => ({ ...inv, supplyDate }))
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-fg-muted">When payment is due</span>
        <SegmentedControl
          label="When payment is due"
          options={DUE_MODES}
          value={invoice.dueMode}
          onChange={(dueMode) =>
            update((inv) => ({
              ...inv,
              dueMode,
              // Terms set the due date, so History still knows when it's overdue.
              dueDate:
                dueMode === 'terms' ? addDays(inv.issueDate, inv.paymentTermsDays) : inv.dueDate,
            }))
          }
          className="h-11 items-center self-start"
          size="sm"
        />
      </div>
      {terms ? (
        <SelectField
          label="Payment terms"
          hint="Printed instead of a due date, e.g. “Net 30 days”."
          value={String(invoice.paymentTermsDays)}
          onChange={(e) => {
            const paymentTermsDays = Number(e.target.value)
            update((inv) => ({
              ...inv,
              paymentTermsDays,
              dueDate: addDays(inv.issueDate, paymentTermsDays),
            }))
          }}
        >
          {paymentTermsOptions(invoice.paymentTermsDays).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
      ) : (
        <TextField
          label="Due date"
          type="date"
          min={invoice.issueDate}
          value={invoice.dueDate}
          error={dueBeforeIssue ? 'The due date is before the issue date.' : undefined}
          onChange={(e) => {
            const dueDate = e.target.value
            if (!validateDate(dueDate)) update((inv) => ({ ...inv, dueDate }))
          }}
        />
      )}

      <TextField
        label={LPO_COUNTRIES.has(invoice.country) ? 'LPO number' : 'Purchase order (PO) number'}
        optional
        spellCheck={false}
        placeholder="e.g. 260400881"
        hint="The client’s order reference, printed next to the invoice number."
        value={invoice.poNumber}
        onChange={(e) => update((inv) => ({ ...inv, poNumber: e.target.value }))}
      />

      <SelectField
        label="Currency"
        value={invoice.currency}
        hint="Changing it doesn’t convert amounts you’ve entered."
        onChange={(e) => update((inv) => ({ ...inv, currency: e.target.value }))}
      >
        <optgroup label="Common">
          {currencies.common.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="All currencies">
          {currencies.others.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
      </SelectField>
      <CheckboxField
        label="Write the total in words"
        checked={invoice.amountInWords}
        onChange={(e) => update((inv) => ({ ...inv, amountInWords: e.target.checked }))}
      />
    </div>
  )
}
