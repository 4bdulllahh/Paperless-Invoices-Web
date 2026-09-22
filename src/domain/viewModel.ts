import { calculateTotals, type InvoiceTotals } from './calc'
import { parseDecimalOrZero, RATE_SCALE } from './decimal'
import { formatDate, formatMoney, formatQuantity, formatRate, formatUnitPrice } from './format'
import type { Discount, Invoice, Party, TaxMode, TemplateId } from './schema'

/**
 * Everything a template needs, already calculated and formatted.
 * Templates only lay this out, so all three always show identical numbers.
 */
export type InvoiceViewModel = {
  number: string
  issueDate: string
  dueDate: string
  currency: string
  taxMode: TaxMode
  templateId: TemplateId
  from: PartyView
  to: PartyView
  lines: LineView[]
  /** Only when lines use different tax rates; otherwise the rate appears in the totals. */
  showTaxColumn: boolean
  showDiscountColumn: boolean
  totals: TotalRow[]
  balanceDue: string
  /** For the payment QR code. */
  balanceDueMinor: number
  notes: string
  /** The raw calculation, for anything that needs numbers rather than text. */
  raw: InvoiceTotals
}

export type PartyView = Omit<Party, 'address'> & { addressLines: string[] }

export type LineView = {
  id: string
  description: string
  quantity: string
  unitPrice: string
  /** Empty when the line has no tax. */
  taxRate: string
  /** Empty when the line has no discount. */
  discount: string
  amount: string
}

export type TotalRow = {
  kind: 'subtotal' | 'discount' | 'tax' | 'total' | 'paid' | 'balance'
  label: string
  value: string
}

export function buildInvoiceViewModel(invoice: Invoice): InvoiceViewModel {
  const { currency, locale } = invoice
  const totals = calculateTotals(invoice)
  const money = (minor: number) => formatMoney(minor, currency, locale)
  const taxLabel = invoice.taxLabel || 'Tax'

  // Only called for discounts that took something off, so the type is percent or fixed.
  const discountText = (discount: Discount): string =>
    discount.type === 'percent'
      ? formatRate(Number(parseDecimalOrZero(discount.value, RATE_SCALE)), locale)
      : formatUnitPrice(discount.value, currency, locale)

  const lines: LineView[] = invoice.items.map((item, i) => {
    const line = totals.lines[i]
    return {
      id: item.id,
      description: item.description,
      quantity: formatQuantity(item.quantity, locale),
      unitPrice: formatUnitPrice(item.unitPrice, currency, locale),
      taxRate: line.taxRatePpm > 0 ? formatRate(line.taxRatePpm, locale) : '',
      discount: line.lineDiscount > 0 ? discountText(item.discount) : '',
      amount: money(line.net),
    }
  })

  const rows: TotalRow[] = [{ kind: 'subtotal', label: 'Subtotal', value: money(totals.subtotal) }]
  if (totals.invoiceDiscount > 0) {
    const detail = invoice.discount.type === 'percent' ? ` (${discountText(invoice.discount)})` : ''
    rows.push({
      kind: 'discount',
      label: `Discount${detail}`,
      value: money(-totals.invoiceDiscount),
    })
  }
  const taxRows: TotalRow[] = totals.taxes.map((t) => ({
    kind: 'tax',
    label: `${invoice.taxMode === 'inclusive' ? 'Includes ' : ''}${taxLabel} ${formatRate(t.taxRatePpm, locale)}`,
    value: money(t.tax),
  }))
  const totalRow: TotalRow = { kind: 'total', label: 'Total', value: money(totals.total) }
  if (invoice.taxMode === 'exclusive') rows.push(...taxRows, totalRow)
  else rows.push(totalRow, ...taxRows)
  if (totals.amountPaid > 0) {
    rows.push({ kind: 'paid', label: 'Amount paid', value: money(-totals.amountPaid) })
  }
  rows.push({ kind: 'balance', label: 'Balance due', value: money(totals.balanceDue) })

  return {
    number: invoice.number,
    issueDate: formatDate(invoice.issueDate, locale),
    dueDate: formatDate(invoice.dueDate, locale),
    currency,
    taxMode: invoice.taxMode,
    templateId: invoice.templateId,
    from: partyView(invoice.from),
    to: partyView(invoice.to),
    lines,
    showTaxColumn: new Set(totals.lines.map((l) => l.taxRatePpm)).size > 1,
    showDiscountColumn: totals.lines.some((l) => l.lineDiscount > 0),
    totals: rows,
    balanceDue: money(totals.balanceDue),
    balanceDueMinor: totals.balanceDue,
    notes: invoice.notes.trim(),
    raw: totals,
  }
}

function partyView({ address, ...party }: Party): PartyView {
  return {
    ...party,
    addressLines: address
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  }
}
