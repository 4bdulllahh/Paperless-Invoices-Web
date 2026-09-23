import { invoicePaymentQr } from '../domain/paymentQr'
import type { PrintAssets } from '../domain/records'
import type { Invoice } from '../domain/schema'
import { buildInvoiceViewModel } from '../domain/viewModel'
import type { TemplateProps } from './layout'

/**
 * Everything a template needs to print an invoice, from what's saved. Used for both the live
 * preview and the downloaded file, so they can't differ. Payment details changed on the invoice
 * itself take the place of the business defaults.
 */
export function buildTemplateProps(invoice: Invoice, assets: PrintAssets): TemplateProps {
  const payment = invoice.payment ?? assets.payment
  const qr = invoicePaymentQr(payment, invoice)
  return {
    view: buildInvoiceViewModel(invoice),
    logo: assets.logo,
    payment,
    qr: qr.status === 'ready' ? qr.qr : null,
    signature: assets.signature,
    stamp: assets.stamp,
  }
}
