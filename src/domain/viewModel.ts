import { calculateTotals, type InvoiceTotals } from './calc'
import { pdfTheme, type PdfTheme } from './colors'
import { taxIdRules } from './compliance'
import { parseDecimalOrZero, RATE_SCALE } from './decimal'
import {
  formatAmount,
  formatDate,
  formatMoney,
  formatPlainUnitPrice,
  formatQuantity,
  formatRate,
  formatUnitPrice,
} from './format'
import { paymentTermsText } from './options'
import type { Discount, Invoice, Party, TaxMode, TemplateId } from './schema'
import { amountInWords } from './words'

/**
 * Everything a template needs, already calculated and formatted.
 * Templates only lay this out, so all of them always show identical numbers.
 */
export type InvoiceViewModel = {
  /** "Invoice", or "Tax Invoice" where the law asks for it. */
  title: string
  number: string
  issueDate: string
  dueDate: string
  /** The due date, or the payment terms printed in its place. */
  due: Fact
  /** What's printed beside the number, in order: date, supply date, PO, due date or terms. */
  facts: Fact[]
  currency: string
  taxMode: TaxMode
  templateId: TemplateId
  /** "VAT", "GST"; "Tax" when unnamed. */
  taxLabel: string
  from: PartyView
  to: PartyView
  lines: LineView[]
  /** Only when lines use different tax rates; otherwise the rate appears in the totals. */
  showTaxColumn: boolean
  showDiscountColumn: boolean
  showUnitColumn: boolean
  /** Heading of the item code column, e.g. "HSN/SAC"; empty when no line has a code. */
  codeLabel: string
  /** Tax rate, tax and total with tax on every line (Gulf and Indian tax invoices). */
  lineTax: boolean
  totals: TotalRow[]
  balanceDue: string
  /** The total in words, when the invoice asks for it. */
  totalInWords: string | null
  notes: string
  /** Print the signature and stamp, or a line to sign on. */
  signed: boolean
  /** The accent colour and the text colours that stay readable with it. */
  theme: PdfTheme
  /** The raw calculation, for anything that needs numbers rather than text. */
  raw: InvoiceTotals
}

export type Fact = { label: string; value: string }

export type PartyView = Omit<Party, 'address'> & {
  addressLines: string[]
  /** How the tax number is labelled, e.g. "TRN". */
  taxIdLabel: string
}

export type LineView = {
  id: string
  /** Line number, "1", "2"… */
  index: string
  description: string
  /** Empty when the line has none. */
  code: string
  unit: string
  quantity: string
  /** "54 Pcs", for narrow tables without a unit column. */
  quantityWithUnit: string
  /** With the currency: "$75.00". */
  unitPrice: string
  /** Empty when the line has no tax. */
  taxRate: string
  /** Empty when the line has no discount. */
  discount: string
  /** The line's amount before tax, with the currency. */
  amount: string
  /** The same numbers without the currency, for tables headed with it ("Rate (AED)"). */
  rate: string
  net: string
  taxAmount: string
  totalWithTax: string
}

export type TotalRow = {
  kind: 'subtotal' | 'discount' | 'taxable' | 'tax' | 'total' | 'paid' | 'balance'
  label: string
  value: string
}

/** Where a client's purchase order is called a "Local Purchase Order". */
const LPO_COUNTRIES = new Set(['AE', 'SA', 'BH', 'OM', 'QA', 'KW'])

export function buildInvoiceViewModel(invoice: Invoice): InvoiceViewModel {
  const { currency, locale } = invoice
  const totals = calculateTotals(invoice)
  const money = (minor: number) => formatMoney(minor, currency, locale)
  const plain = (minor: number) => formatAmount(minor, currency, locale)
  const taxLabel = invoice.taxLabel || 'Tax'

  // Only called for discounts that took something off, so the type is percent or fixed.
  const discountText = (discount: Discount): string =>
    discount.type === 'percent'
      ? formatRate(Number(parseDecimalOrZero(discount.value, RATE_SCALE)), locale)
      : formatUnitPrice(discount.value, currency, locale)

  const lines: LineView[] = invoice.items.map((item, i) => {
    const line = totals.lines[i]
    const quantity = formatQuantity(item.quantity, locale)
    return {
      id: item.id,
      index: String(i + 1),
      description: item.description,
      code: item.code,
      unit: item.unit,
      quantity,
      quantityWithUnit: item.unit ? `${quantity} ${item.unit}` : quantity,
      unitPrice: formatUnitPrice(item.unitPrice, currency, locale),
      taxRate: line.taxRatePpm > 0 ? formatRate(line.taxRatePpm, locale) : '',
      discount: line.lineDiscount > 0 ? discountText(item.discount) : '',
      amount: money(line.net),
      rate: formatPlainUnitPrice(item.unitPrice, currency, locale),
      net: plain(line.net),
      taxAmount: plain(line.tax),
      totalWithTax: plain(line.totalWithTax),
    }
  })

  const hasTax = totals.taxes.length > 0
  const inclusive = invoice.taxMode === 'inclusive'
  const rows: TotalRow[] = []
  if (!hasTax || inclusive || totals.invoiceDiscount > 0) {
    rows.push({ kind: 'subtotal', label: 'Subtotal', value: money(totals.subtotal) })
  }
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
    label: `${inclusive ? 'Includes ' : ''}${taxLabel} ${formatRate(t.taxRatePpm, locale)}`,
    value: money(t.tax),
  }))
  if (inclusive) {
    rows.push({ kind: 'total', label: 'Total', value: money(totals.total) }, ...taxRows)
  } else if (hasTax) {
    rows.push(
      { kind: 'taxable', label: `Total before ${taxLabel}`, value: money(totals.afterDiscount) },
      ...taxRows,
      { kind: 'total', label: 'Grand total', value: money(totals.total) },
    )
  } else {
    rows.push({ kind: 'total', label: 'Total', value: money(totals.total) })
  }
  if (totals.amountPaid > 0) {
    rows.push({ kind: 'paid', label: 'Advance payments', value: money(-totals.amountPaid) })
  }
  rows.push({ kind: 'balance', label: 'Balance due', value: money(totals.balanceDue) })

  const due: Fact =
    invoice.dueMode === 'terms'
      ? { label: 'Payment terms', value: paymentTermsText(invoice.paymentTermsDays) }
      : { label: 'Due date', value: formatDate(invoice.dueDate, locale) }
  const facts: Fact[] = [{ label: 'Invoice date', value: formatDate(invoice.issueDate, locale) }]
  if (invoice.supplyDate) {
    facts.push({ label: 'Date of supply', value: formatDate(invoice.supplyDate, locale) })
  }
  if (invoice.poNumber) {
    const poLabel = LPO_COUNTRIES.has(invoice.country) ? 'LPO no.' : 'PO no.'
    facts.push({ label: poLabel, value: invoice.poNumber })
  }
  facts.push(due)

  const hasCodes = invoice.items.some((item) => item.code)
  const taxIdLabel = invoice.taxIdLabel || 'Tax ID'
  return {
    title: invoice.title || 'Invoice',
    number: invoice.number,
    issueDate: formatDate(invoice.issueDate, locale),
    dueDate: formatDate(invoice.dueDate, locale),
    due,
    facts,
    currency,
    taxMode: invoice.taxMode,
    templateId: invoice.templateId,
    taxLabel,
    from: partyView(invoice.from, taxIdLabel),
    to: partyView(invoice.to, taxIdLabel),
    lines,
    showTaxColumn: new Set(totals.lines.map((l) => l.taxRatePpm)).size > 1,
    showDiscountColumn: totals.lines.some((l) => l.lineDiscount > 0),
    showUnitColumn: invoice.items.some((item) => item.unit),
    codeLabel: hasCodes ? taxIdRules(invoice.country).itemCode || 'Code' : '',
    lineTax: invoice.showLineTax,
    totals: rows,
    balanceDue: money(totals.balanceDue),
    totalInWords: invoice.amountInWords ? amountInWords(totals.total, currency) : null,
    notes: invoice.notes.trim(),
    signed: invoice.signed,
    theme: pdfTheme(invoice.accentColor),
    raw: totals,
  }
}

function partyView({ address, ...party }: Party, taxIdLabel: string): PartyView {
  return {
    ...party,
    taxIdLabel,
    addressLines: address
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  }
}
