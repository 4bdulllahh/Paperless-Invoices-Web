import { Target, Undo2, WandSparkles } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { CheckboxField } from '../../../components/ui/Checkbox'
import { DecimalField } from '../../../components/ui/DecimalField'
import { TextField } from '../../../components/ui/Field'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { calculateTotals } from '../../../domain/calc'
import { MONEY_SCALE, parseDecimal } from '../../../domain/decimal'
import { formatMoney } from '../../../domain/format'
import { currencyDigits } from '../../../domain/money'
import { fitToTotal, includeTaxInPrices, type PriceFit } from '../../../domain/pricing'
import type { Discount, Invoice, LineItem } from '../../../domain/schema'
import { validateMoney, validatePercent } from '../validators'
import type { InvoiceUpdater } from './types'

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
      </div>
      <CheckboxField
        label={`Show ${invoice.taxLabel || 'tax'} on each line`}
        hint="Adds the rate, amount and total with tax to every line, as tax invoices in the Gulf and India do."
        checked={invoice.showLineTax}
        onChange={(e) => update((inv) => ({ ...inv, showLineTax: e.target.checked }))}
      />

      <PriceTools invoice={invoice} update={update} />

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
        label="Advance payments"
        optional
        placeholder="0"
        hint="Deposits or payments already received. Subtracted from the balance due."
        locale={invoice.locale}
        value={invoice.amountPaid}
        validate={validateMoney}
        onCommit={(amountPaid) => update((inv) => ({ ...inv, amountPaid }))}
      />
    </div>
  )
}

type Result = { message: string; undo: LineItem[]; undoMode: Invoice['taxMode'] }

/**
 * Working back from the total. "Tax included" lowers every rate so the tax fits inside today's
 * total (100.00 becomes 95.24 + 4.76 VAT). A grand total typed in raises or lowers every rate
 * equally to reach it. Rates keep the currency's decimals, and either can be undone.
 */
function PriceTools({ invoice, update }: { invoice: Invoice; update: InvoiceUpdater }) {
  const [target, setTarget] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const totals = calculateTotals(invoice)
  const money = (minor: number) => formatMoney(minor, invoice.currency, invoice.locale)
  const taxLabel = invoice.taxLabel || 'tax'
  const legacyInclusive = invoice.taxMode === 'inclusive'

  function apply(next: Invoice, fit: PriceFit, message: string) {
    setResult({
      message: fit.exact
        ? message
        : `${message} That’s as close as prices with ${currencyDigits(invoice.currency)} decimals can get.`,
      undo: invoice.items,
      undoMode: invoice.taxMode,
    })
    update((inv) => ({ ...inv, taxMode: next.taxMode, items: next.items }))
  }

  function includeTax() {
    const fit = includeTaxInPrices(invoice)
    if (!fit) return
    apply(
      fit.invoice,
      fit,
      `Rates lowered so the grand total is ${money(fit.total)} with ${taxLabel}.`,
    )
  }

  function reachTarget() {
    const scaled = parseDecimal(target, MONEY_SCALE)
    if (scaled === null) return
    const digits = currencyDigits(invoice.currency)
    const minor = Number(scaled / 10n ** BigInt(MONEY_SCALE - digits))
    const fit = fitToTotal(invoice, minor)
    if (!fit) return
    apply(
      { ...invoice, items: fit.items },
      fit,
      `Rates ${minor < totals.total ? 'lowered' : 'raised'} so the grand total is ${money(fit.total)}.`,
    )
    setTarget('')
  }

  const hasPrices = totals.total > 0
  const targetError = target && validateMoney(target)

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line p-3">
      <div>
        <p className="text-sm font-medium">Rates are before {taxLabel}</p>
        <p className="text-xs text-fg-subtle">
          {legacyInclusive
            ? `This invoice was made with prices that include ${taxLabel}. Convert them to before-${taxLabel} rates, keeping the total.`
            : `Agreed a price with ${taxLabel} included? Let Paperless work out the rates.`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={includeTax}
          disabled={totals.taxTotal === 0}
          title={totals.taxTotal === 0 ? `Add a ${taxLabel} rate to the items first` : undefined}
        >
          <WandSparkles />
          {legacyInclusive
            ? 'Convert prices'
            : `Include ${taxLabel} in ${money(totals.afterDiscount)}`}
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <DecimalField
          label="Grand total you want"
          optional
          className="min-w-40 flex-1"
          placeholder={hasPrices ? String(Math.ceil(totals.total / 10 ** totals.digits)) : '0'}
          locale={invoice.locale}
          value={target}
          validate={validateMoney}
          onCommit={setTarget}
          onKeyDown={(e) => {
            if (e.key === 'Enter') reachTarget()
          }}
        />
        <Button
          size="sm"
          className="h-11"
          onClick={reachTarget}
          disabled={!hasPrices || !target || Boolean(targetError)}
        >
          <Target />
          Fit rates
        </Button>
      </div>
      {result && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-accent-soft px-3 py-2 text-sm"
        >
          <span>{result.message}</span>
          <Button
            size="sm"
            variant="ghost"
            className="-my-1 h-8 px-3"
            onClick={() => {
              update((inv) => ({ ...inv, items: result.undo, taxMode: result.undoMode }))
              setResult(null)
            }}
          >
            <Undo2 />
            Undo
          </Button>
        </div>
      )}
    </div>
  )
}
