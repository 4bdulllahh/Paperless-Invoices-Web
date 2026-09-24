import type { Styles } from '@react-pdf/renderer'
import type { PaymentQr } from '../domain/paymentQr'
import type { Logo, PaymentDetails } from '../domain/records'
import type { InvoiceViewModel, LineView, PartyView } from '../domain/viewModel'

/** Everything a template receives. Templates lay this out; they never calculate. */
export type TemplateProps = {
  view: InvoiceViewModel
  logo: Logo | null
  /** The invoice's own payment details, or the business defaults. */
  payment: PaymentDetails
  /** Only when this invoice can carry one. */
  qr: PaymentQr | null
  signature: Logo | null
  stamp: Logo | null
}

/** Print colours: the brand palette, tuned for paper. */
export const INK = '#252422'
export const OLIVE = '#403d39'
export const MUTED = '#6b665f'
export const SAND = '#ccc5b9'
export const HAIRLINE = '#e0dbd0'
export const CREAM = '#fffcf2'
export const PAPER_TINT = '#f6f2e9'

export type Style = Styles[string]

/** The party's lines under its name, in print order. */
export function partyLines(party: PartyView): string[] {
  return [
    ...party.addressLines,
    party.email,
    party.phone,
    party.taxId && `${party.taxIdLabel}: ${party.taxId}`,
  ].filter(Boolean)
}

type ColumnKey =
  | 'index'
  | 'description'
  | 'code'
  | 'unit'
  | 'quantity'
  | 'quantityWithUnit'
  | 'unitPrice'
  | 'rate'
  | 'taxRate'
  | 'discount'
  | 'amount'
  | 'net'
  | 'taxAmount'
  | 'totalWithTax'

export type Column = {
  key: ColumnKey
  label: string
  /** Fixed width in points, padding included; the description column takes the rest. */
  width?: number
  align: 'left' | 'right'
  /** The line's bottom line, printed in bold. */
  strong?: boolean
}

/** The table on a Modern A4 page; templates pass their own. Narrower tables drop columns. */
export const DEFAULT_TABLE_WIDTH = 495
const WIDE_TABLE = 440

/**
 * Item table columns. Tax and discount columns only appear when they carry information.
 * With tax on every line (Gulf and Indian tax invoices) the table follows the FTA layout:
 * No., description, unit, quantity, rate, amount, tax rate, tax, and total with tax, with the
 * currency in the headings. Narrow tables fold the unit into the quantity and drop the numbering.
 */
export function itemColumns(view: InvoiceViewModel, width = DEFAULT_TABLE_WIDTH): Column[] {
  const code: Column[] = view.codeLabel
    ? [{ key: 'code', label: view.codeLabel, width: 50, align: 'left' }]
    : []
  const discount: Column[] = view.showDiscountColumn
    ? [{ key: 'discount', label: 'Discount', width: 52, align: 'right' }]
    : []
  const unit: Column[] = view.showUnitColumn
    ? [{ key: 'unit', label: 'Unit', width: 34, align: 'left' }]
    : []

  if (!view.lineTax) {
    return [
      { key: 'description', label: 'Description', align: 'left' },
      ...code,
      ...unit,
      { key: 'quantity', label: 'Qty', width: 44, align: 'right' },
      { key: 'unitPrice', label: 'Price', width: 78, align: 'right' },
      ...(view.showTaxColumn
        ? [{ key: 'taxRate', label: 'Tax', width: 50, align: 'right' } as const]
        : []),
      ...discount,
      { key: 'amount', label: 'Amount', width: 86, align: 'right', strong: true },
    ]
  }

  const { currency, taxLabel } = view
  const wide = width >= WIDE_TABLE
  const singleRate = view.showTaxColumn ? '' : (view.lines.find((l) => l.taxRate)?.taxRate ?? '')
  const taxRateColumn: Column[] =
    wide || !singleRate
      ? [{ key: 'taxRate', label: `${taxLabel} rate`, width: 36, align: 'right' }]
      : []
  return [
    ...(wide ? [{ key: 'index', label: 'No.', width: 26, align: 'left' } as const] : []),
    { key: 'description', label: 'Description', align: 'left' },
    ...code,
    ...(wide
      ? [...unit, { key: 'quantity', label: 'Qty', width: 36, align: 'right' } as const]
      : [{ key: 'quantityWithUnit', label: 'Qty', width: 46, align: 'right' } as const]),
    { key: 'rate', label: `Rate ${currency}`, width: 54, align: 'right' },
    ...discount,
    { key: 'net', label: `Amount ${currency}`, width: 60, align: 'right' },
    ...taxRateColumn,
    {
      key: 'taxAmount',
      label: taxRateColumn.length ? `${taxLabel} ${currency}` : `${taxLabel} ${singleRate}`,
      width: 52,
      align: 'right',
    },
    {
      key: 'totalWithTax',
      label: `Total with ${taxLabel} ${currency}`,
      width: 66,
      align: 'right',
      strong: true,
    },
  ]
}

export function cellStyle(column: Column): Style {
  return column.width
    ? { width: column.width, textAlign: column.align, paddingLeft: 6 }
    : { flex: 1, textAlign: column.align }
}

export const cellText = (line: LineView, column: Column) => line[column.key] || ''

/** Printed bank details, skipping any already written out in the instructions. */
export function bankLines(payment: PaymentDetails): string[] {
  const squash = (text: string) => text.replace(/\s/g, '').toLowerCase()
  const written = squash(payment.instructions)
  return (
    [
      ['Bank', payment.bankName],
      ['Account name', payment.accountName],
      ['Account no.', payment.accountNumber],
      ['IBAN', payment.iban],
      ['SWIFT/BIC', payment.bic],
    ] as const
  )
    .filter(([, value]) => value && !written.includes(squash(value)))
    .map(([label, value]) => `${label}: ${value}`)
}
