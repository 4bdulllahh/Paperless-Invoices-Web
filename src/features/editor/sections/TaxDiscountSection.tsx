import { DecimalField } from '../../../components/ui/DecimalField'
import { TextField } from '../../../components/ui/Field'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import type { Discount, Invoice, TaxMode } from '../../../domain/schema'
import { validateMoney, validatePercent } from '../validators'
import type { InvoiceUpdater } from './types'

const TAX_MODES = [
  { value: 'exclusive', label: 'Tax added on top' },
  { value: 'inclusive', label: 'Tax included' },
] as const satisfies readonly { value: TaxMode; label: string }[]

const DISCOUNT_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'percent', label: 'Percent' },
  { value: 'fixed', label: 'Amount' },
] as const satisfies readonly { value: Discount['type']; label: string }[]

export function TaxDiscountSection({
  invoice,
  update,
}: {
  invoice: Invoice
  update: InvoiceUpdater
}) {
  const { discount } = invoice

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Tax name"
          placeholder="VAT, GST or Sales tax"
          value={invoice.taxLabel}
          onChange={(e) => update((inv) => ({ ...inv, taxLabel: e.target.value }))}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg-muted">Prices on this invoice have</span>
          <SegmentedControl
            label="Prices on this invoice have"
            options={TAX_MODES}
            value={invoice.taxMode}
            onChange={(taxMode) => update((inv) => ({ ...inv, taxMode }))}
            className="h-11 items-center self-start"
            size="sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-fg-muted">Discount on the whole invoice</span>
        <div className="flex flex-wrap items-end gap-3">
          <SegmentedControl
            label="Discount on the whole invoice"
            options={DISCOUNT_TYPES}
            value={discount.type}
            onChange={(type) => update((inv) => ({ ...inv, discount: { type, value: '' } }))}
            className="h-11 items-center"
            size="sm"
          />
          {discount.type !== 'none' && (
            <DecimalField
              label={discount.type === 'percent' ? 'Percent off' : 'Amount off'}
              className="min-w-32 flex-1"
              locale={invoice.locale}
              value={discount.value}
              validate={discount.type === 'percent' ? validatePercent : validateMoney}
              onCommit={(value) =>
                update((inv) => ({ ...inv, discount: { ...inv.discount, value } }))
              }
            />
          )}
        </div>
        <p className="text-xs text-fg-subtle">Taken off before tax.</p>
      </div>

      <DecimalField
        label="Already paid"
        optional
        placeholder="0"
        hint="Deposits or part-payments. Subtracted from the balance due."
        locale={invoice.locale}
        value={invoice.amountPaid}
        validate={validateMoney}
        onCommit={(amountPaid) => update((inv) => ({ ...inv, amountPaid }))}
      />
    </div>
  )
}
