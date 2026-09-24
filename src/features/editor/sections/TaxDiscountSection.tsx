import { Redo2, Target, Undo2, WandSparkles } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { CheckboxField } from '../../../components/ui/Checkbox'
import { DecimalField } from '../../../components/ui/DecimalField'
import { TextField } from '../../../components/ui/Field'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { calculateTotals } from '../../../domain/calc'
import { MONEY_SCALE, parseDecimal } from '../../../domain/decimal'
import { sameData } from '../../../domain/equal'
import { formatMoney } from '../../../domain/format'
import { currencyDigits } from '../../../domain/money'
import { fitToTotal, includeTaxInPrices, type PriceFit } from '../../../domain/pricing'
import type { Discount, Invoice, LineItem, TaxMode, TaxPricing } from '../../../domain/schema'
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
  // Kept here so hiding the price tools doesn't lose what can be undone.
  const history = useState<PriceHistory>(EMPTY_HISTORY)
  const tax = invoice.taxLabel || 'Tax'
  const pricing: { value: TaxPricing; label: string }[] = [
    { value: 'added', label: `${tax} added on top` },
    { value: 'included', label: `${tax} included` },
  ]
  // Invoices saved with the old tax-inclusive prices always get the offer to convert them.
  const showPriceTools = invoice.taxPricing === 'included' || invoice.taxMode === 'inclusive'

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

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-fg-muted">Prices agreed with this client</span>
        <SegmentedControl
          label="Prices agreed with this client"
          options={pricing}
          value={invoice.taxPricing}
          onChange={(taxPricing) => update((inv) => ({ ...inv, taxPricing }))}
          className="self-start"
          size="sm"
        />
        <p className="text-xs text-fg-subtle">
          {invoice.taxPricing === 'included'
            ? `The price you agreed already contains ${tax}. Paperless works out the rates before ${tax}, which is what the invoice shows.`
            : `${tax} is added to the rates you type.`}
        </p>
      </div>

      <CheckboxField
        label={`Show ${invoice.taxLabel || 'tax'} on each line`}
        hint="Adds the rate, amount and total with tax to every line, as tax invoices in the Gulf and India do."
        checked={invoice.showLineTax}
        onChange={(e) => update((inv) => ({ ...inv, showLineTax: e.target.checked }))}
      />

      {showPriceTools && <PriceTools invoice={invoice} update={update} history={history} />}

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

type Prices = { items: LineItem[]; taxMode: TaxMode }
type PriceChange = { before: Prices; after: Prices; message: string }
/** Changes that can be undone, oldest first, and those undone that can be redone. */
type PriceHistory = { done: PriceChange[]; undone: PriceChange[] }

const EMPTY_HISTORY: PriceHistory = { done: [], undone: [] }

const pricesOf = (invoice: Invoice): Prices => ({
  items: invoice.items,
  taxMode: invoice.taxMode,
})

/**
 * Working back from the total. "Tax included" lowers every rate so the tax fits inside today's
 * total (100.00 becomes 95.24 + 4.76 VAT). A grand total typed in raises or lowers every rate
 * equally to reach it. Rates keep the currency's decimals. Every change can be undone and
 * redone, one step at a time, so pressing a button twice by mistake is easy to take back.
 */
function PriceTools({
  invoice,
  update,
  history: [history, setHistory],
}: {
  invoice: Invoice
  update: InvoiceUpdater
  history: [PriceHistory, (history: PriceHistory) => void]
}) {
  const [target, setTarget] = useState('')
  const totals = calculateTotals(invoice)
  const money = (minor: number) => formatMoney(minor, invoice.currency, invoice.locale)
  const taxLabel = invoice.taxLabel || 'tax'
  const legacyInclusive = invoice.taxMode === 'inclusive'

  // The prices the history expects to find. Once the items are edited by hand, undoing would
  // throw those edits away, so the history no longer applies.
  const last = history.done.at(-1)
  const expected = last ? last.after : history.undone.at(-1)?.before
  const { done, undone } =
    expected && sameData(expected, pricesOf(invoice)) ? history : EMPTY_HISTORY

  function apply(next: Prices, fit: PriceFit, message: string) {
    const change: PriceChange = {
      before: pricesOf(invoice),
      after: next,
      message: fit.exact
        ? message
        : `${message} That’s as close as prices with ${currencyDigits(invoice.currency)} decimals can get.`,
    }
    setHistory({ done: [...done, change], undone: [] })
    // Converted old prices were agreed with tax included, so the tools stay open for undoing.
    update((inv) => ({
      ...inv,
      ...next,
      taxPricing: legacyInclusive ? 'included' : inv.taxPricing,
    }))
  }

  function undo() {
    const change = done.at(-1)!
    setHistory({ done: done.slice(0, -1), undone: [...undone, change] })
    update((inv) => ({ ...inv, ...change.before }))
  }

  function redo() {
    const change = undone.at(-1)!
    setHistory({ done: [...done, change], undone: undone.slice(0, -1) })
    update((inv) => ({ ...inv, ...change.after }))
  }

  function includeTax() {
    const fit = includeTaxInPrices(invoice)
    if (!fit) return
    apply(
      pricesOf(fit.invoice),
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
      { items: fit.items, taxMode: invoice.taxMode },
      fit,
      `Rates ${minor < totals.total ? 'lowered' : 'raised'} so the grand total is ${money(fit.total)}.`,
    )
    setTarget('')
  }

  const hasPrices = totals.total > 0
  const targetError = target && validateMoney(target)
  const status = done.at(-1)?.message ?? 'Back to the rates as they were.'

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line p-3">
      <div>
        <p className="text-sm font-medium">Rates are before {taxLabel}</p>
        <p className="text-xs text-fg-subtle">
          {legacyInclusive
            ? `This invoice was made with prices that include ${taxLabel}. Convert them to before-${taxLabel} rates, keeping the total.`
            : `Type the price you agreed as the rate, then let Paperless take the ${taxLabel} out of it, or aim for a grand total.`}
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
      {(done.length > 0 || undone.length > 0) && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-accent-soft py-1.5 pr-1.5 pl-3 text-sm">
          <span role="status">{status}</span>
          <div role="group" aria-label="Rate changes" className="flex shrink-0 gap-0.5">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Undo"
              title={done.length ? `Undo (${done.length} left)` : 'Nothing to undo'}
              disabled={done.length === 0}
              onClick={undo}
            >
              <Undo2 />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Redo"
              title={undone.length ? `Redo (${undone.length} left)` : 'Nothing to redo'}
              disabled={undone.length === 0}
              onClick={redo}
            >
              <Redo2 />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
