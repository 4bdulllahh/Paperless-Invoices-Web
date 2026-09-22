import { invoicePaymentQr } from '../domain/paymentQr'
import type { Logo, PaymentDetails } from '../domain/records'
import type { Invoice } from '../domain/schema'
import { buildInvoiceViewModel } from '../domain/viewModel'
import type { TemplateProps } from './layout'

/**
 * Everything a template needs to print an invoice, from what's saved. Used for both the live
 * preview and the downloaded file, so they can't differ.
 */
export function buildTemplateProps(
  invoice: Invoice,
  logo: Logo | null,
  payment: PaymentDetails,
): TemplateProps {
  const qr = invoicePaymentQr(payment, invoice)
  return {
    view: buildInvoiceViewModel(invoice),
    logo,
    payment,
    qr: qr.status === 'ready' ? qr.qr : null,
  }
}
