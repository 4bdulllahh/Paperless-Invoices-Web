import type { Styles } from '@react-pdf/renderer'
import type { PaymentQr } from '../domain/paymentQr'
import type { Logo, PaymentDetails } from '../domain/records'
import type { InvoiceViewModel, LineView, PartyView } from '../domain/viewModel'

/** Everything a template receives. Templates lay this out; they never calculate. */
export type TemplateProps = {
  view: InvoiceViewModel
  logo: Logo | null
  payment: PaymentDetails
  /** Only when this invoice can carry one. */
  qr: PaymentQr | null
}

/** Print colours: the brand palette, tuned for paper. */
export const INK = '#252422'
export const OLIVE = '#403d39'
export const MUTED = '#6b665f'
export const SAND = '#ccc5b9'
export const HAIRLINE = '#e0dbd0'
export const CREAM = '#fffcf2'
export const PAPER_TINT = '#f6f2e9'
export const FLAME = '#eb5e28'

export type Style = Styles[string]

/** The party's lines under its name, in print order. */
export function partyLines(party: PartyView): string[] {
  return [
    ...party.addressLines,
    party.email,
    party.phone,
    party.taxId && `Tax ID: ${party.taxId}`,
  ].filter(Boolean)
}

export type Column = {
  key: 'description' | 'quantity' | 'unitPrice' | 'taxRate' | 'discount' | 'amount'
  label: string
  /** Fixed width in points; the description column takes the rest. */
  width?: number
  align: 'left' | 'right'
}

/** Item table columns. Tax and discount columns only appear when they carry information. */
export function itemColumns(view: InvoiceViewModel): Column[] {
  return [
    { key: 'description', label: 'Description', align: 'left' },
    { key: 'quantity', label: 'Qty', width: 44, align: 'right' },
    { key: 'unitPrice', label: 'Price', width: 78, align: 'right' },
    ...(view.showTaxColumn
      ? [{ key: 'taxRate', label: 'Tax', width: 50, align: 'right' } as const]
      : []),
    ...(view.showDiscountColumn
      ? [{ key: 'discount', label: 'Discount', width: 58, align: 'right' } as const]
      : []),
    { key: 'amount', label: 'Amount', width: 86, align: 'right' },
  ]
}

export function cellStyle(column: Column): Style {
  return column.width
    ? { width: column.width, textAlign: column.align, paddingLeft: 8 }
    : { flex: 1, textAlign: column.align }
}

export const cellText = (line: LineView, column: Column) => line[column.key] || ''
