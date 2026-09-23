import { useMemo } from 'react'
import { CheckboxField } from '../../../components/ui/Checkbox'
import { SelectField, TextField } from '../../../components/ui/Field'
import { addDays, daysBetween } from '../../../domain/dates'
import { currencyOptions } from '../../../domain/options'
import type { Invoice } from '../../../domain/schema'
import { validateDate } from '../validators'
import type { InvoiceUpdater } from './types'

/** Title, number, dates and currency. */
export function InvoiceSection({ invoice, update }: { invoice: Invoice; update: InvoiceUpdater }) {
  const currencies = useMemo(() => currencyOptions(invoice.locale), [invoice.locale])
  const dueBeforeIssue = invoice.dueDate < invoice.issueDate

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
      </div>
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
