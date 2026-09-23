import { calculateTotals } from './calc'
import { minorToDecimal } from './money'
import { paymentLinkIssue, type PaymentDetails } from './records'
import type { Invoice } from './schema'

/**
 * The payment QR code printed on an invoice: what it encodes, and why there isn't one when
 * there can't be (wrong currency, nothing left to pay, details missing).
 *
 * - Payment link: the link itself, e.g. a Stripe or PayPal page.
 * - UPI (India): a upi://pay link any UPI app opens with the amount filled in.
 * - SEPA: an EPC QR code ("GiroCode"), which European banking apps turn into a transfer.
 */

/** The parts of an invoice a QR code needs. */
export type QrInvoice = {
  /** Invoice number, used as the payment reference. */
  number: string
  currency: string
  /** Who gets paid: the invoice's sender. */
  payee: string
  /** In minor units. */
  balanceDue: number
}

export type PaymentQr = {
  /** The text encoded in the QR code. */
  payload: string
  /** Printed beside the code. */
  title: string
  detail: string
}

export type PaymentQrStatus =
  { status: 'off' } | { status: 'ready'; qr: PaymentQr } | { status: 'unavailable'; reason: string }

export function paymentQr(payment: PaymentDetails, invoice: QrInvoice): PaymentQrStatus {
  switch (payment.qr) {
    case 'none':
      return { status: 'off' }
    case 'link':
      return linkQr(payment.link, invoice)
    case 'upi':
      return upiQr(payment.upiId, invoice)
    case 'sepa':
      return sepaQr(payment.iban, payment.bic, invoice)
  }
}

/** The QR code for an invoice as it stands, for the PDF and for the editor's summary. */
export function invoicePaymentQr(payment: PaymentDetails, invoice: Invoice): PaymentQrStatus {
  return paymentQr(payment, {
    number: invoice.number,
    currency: invoice.currency,
    payee: invoice.from.name,
    balanceDue: calculateTotals(invoice).balanceDue,
  })
}

const unavailable = (reason: string): PaymentQrStatus => ({ status: 'unavailable', reason })
const ready = (qr: PaymentQr): PaymentQrStatus => ({ status: 'ready', qr })

const NOTHING_DUE = 'Nothing is left to pay on this invoice, so it has no QR code.'

const reference = (invoice: QrInvoice) =>
  invoice.number.trim() ? `Invoice ${invoice.number.trim()}` : ''

/** Names go on a single line in both UPI and EPC codes. */
const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim()

/** Cut to a number of characters without splitting an emoji or accented letter in two. */
const truncate = (text: string, length: number) => Array.from(text).slice(0, length).join('')

/* Payment link */

function linkQr(link: string, invoice: QrInvoice): PaymentQrStatus {
  // A link was never added: nothing was asked for, so there's nothing to explain.
  if (!link) return { status: 'off' }
  if (paymentLinkIssue(link)) return unavailable('The payment link isn’t a full https:// link.')
  if (invoice.balanceDue <= 0) return unavailable(NOTHING_DUE)
  return ready({
    payload: link,
    title: 'Scan to pay online',
    detail: `Opens ${new URL(link).host}`,
  })
}

/* UPI */

const UPI_ID = /^[a-z0-9._-]{2,256}@[a-z][a-z0-9]{1,63}$/i

export function upiIdIssue(id: string): string | undefined {
  if (!id.trim() || UPI_ID.test(id.trim())) return undefined
  return 'Enter a UPI ID like yourname@okhdfcbank.'
}

function upiQr(upiId: string, invoice: QrInvoice): PaymentQrStatus {
  const id = upiId.trim()
  if (!id || upiIdIssue(id))
    return unavailable('Add your UPI ID in Business to show a UPI QR code.')
  if (invoice.currency !== 'INR') {
    return unavailable('UPI QR codes are only added to invoices in Indian rupees (INR).')
  }
  const payee = oneLine(invoice.payee)
  if (!payee) return unavailable('Add your business name to show a UPI QR code.')
  if (invoice.balanceDue <= 0) return unavailable(NOTHING_DUE)

  // The ID is left as typed: some UPI apps don't decode "%40" back to "@".
  const params = [
    `pa=${id}`,
    `pn=${encodeURIComponent(truncate(payee, 50))}`,
    `am=${minorToDecimal(invoice.balanceDue, 'INR')}`,
    'cu=INR',
  ]
  const note = reference(invoice)
  if (note) params.push(`tn=${encodeURIComponent(truncate(note, 50))}`)

  return ready({
    payload: `upi://pay?${params.join('&')}`,
    title: 'Scan to pay with UPI',
    detail: `To ${id}, amount filled in`,
  })
}

/* SEPA (EPC QR code, version 002) */

/** Without spaces or dashes, in capitals: how banks and QR codes want it. */
export const compactIban = (iban: string) => iban.replace(/[\s-]/g, '').toUpperCase()

/** In groups of four, the way it's printed: DE89 3704 0044 0532 0130 00 */
export const formatIban = (iban: string) => compactIban(iban).replace(/(.{4})(?!$)/g, '$1 ')

/** Country code, check digits, then 11–30 letters or digits, passing the mod-97 check. */
export function isValidIban(iban: string): boolean {
  const compact = compactIban(iban)
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact)) return false
  let remainder = 0
  for (const char of compact.slice(4) + compact.slice(0, 4)) {
    const value = parseInt(char, 36) // digits stay 0–9, letters become 10–35
    remainder = (remainder * (value > 9 ? 100 : 10) + value) % 97
  }
  return remainder === 1
}

export function ibanIssue(iban: string): string | undefined {
  if (!iban.trim() || isValidIban(iban)) return undefined
  return 'Check the IBAN. It looks like AE07 0331 2345 6789 0123 456.'
}

const BIC = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/

export function bicIssue(bic: string): string | undefined {
  if (!bic.trim() || BIC.test(bic.trim().toUpperCase())) return undefined
  return 'A BIC has 8 or 11 letters and digits, e.g. COBADEFFXXX.'
}

/** The EPC standard caps the whole payload at 331 bytes, and amounts at €999,999,999.99. */
const EPC_MAX_BYTES = 331
const EPC_MAX_CENTS = 99_999_999_999

const utf8Length = (text: string) => new TextEncoder().encode(text).length

function sepaQr(iban: string, bic: string, invoice: QrInvoice): PaymentQrStatus {
  if (!iban.trim() || !isValidIban(iban)) {
    return unavailable('Add your IBAN in Business to show a SEPA QR code.')
  }
  if (bicIssue(bic)) return unavailable('Check the BIC in Business.')
  if (invoice.currency !== 'EUR') {
    return unavailable('SEPA QR codes are only added to invoices in euros (EUR).')
  }
  const payee = truncate(oneLine(invoice.payee), 70)
  if (!payee) return unavailable('Add your business name to show a SEPA QR code.')
  if (invoice.balanceDue <= 0) return unavailable(NOTHING_DUE)
  if (invoice.balanceDue > EPC_MAX_CENTS) {
    return unavailable('The amount is too large for a SEPA QR code.')
  }

  const lines = [
    'BCD', // service tag
    '002', // version: BIC optional
    '1', // character set: UTF-8
    'SCT', // SEPA credit transfer
    bic.trim().toUpperCase(),
    payee,
    compactIban(iban),
    `EUR${minorToDecimal(invoice.balanceDue, 'EUR')}`,
    '', // purpose code
    '', // structured reference (unused: the invoice number goes in the text below)
  ]
  const head = lines.join('\n') + '\n'
  if (utf8Length(head) > EPC_MAX_BYTES) {
    return unavailable('Your business name is too long for a SEPA QR code.')
  }

  // The reference text gets whatever room is left, up to its own limit of 140 characters.
  let text = truncate(reference(invoice), 140)
  while (utf8Length(head + text) > EPC_MAX_BYTES) text = truncate(text, Array.from(text).length - 1)

  return ready({
    payload: (head + text).trimEnd(),
    title: 'Scan to pay by bank transfer',
    detail: 'Banking apps fill in the IBAN, amount and reference.',
  })
}
