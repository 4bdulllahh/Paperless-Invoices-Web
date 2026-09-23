import { z } from 'zod'
import {
  invoiceSchema,
  partySchema,
  percentSchema,
  TAX_MODES,
  TEMPLATE_IDS,
  type Party,
} from './schema'

/**
 * Everything Paperless saves besides the invoice itself. Each schema is also what stored data
 * and imported backups are checked against before use.
 */

/** What the QR code on an invoice does when scanned, if there is one. */
export const QR_METHODS = ['link', 'upi', 'sepa', 'none'] as const

/**
 * How clients pay. The QR details are plain strings here: a mistyped IBAN only means no QR code,
 * never a profile that fails to load.
 */
export const paymentDetailsSchema = z.object({
  /** Free text printed on invoices, e.g. bank name, account number, IBAN. */
  instructions: z.string(),
  /** Optional https link a client can pay at (PayPal, Stripe, Wise…). */
  link: z.string().trim(),
  qr: z.enum(QR_METHODS),
  /** UPI ID for rupee invoices, e.g. acmestudio@okhdfcbank. */
  upiId: z.string().trim(),
  /** Account for SEPA QR codes on euro invoices. */
  iban: z.string().trim(),
  /** Optional within the SEPA area. */
  bic: z.string().trim(),
})

export const emptyPaymentDetails = (): PaymentDetails => ({
  instructions: '',
  link: '',
  qr: 'link',
  upiId: '',
  iban: '',
  bic: '',
})

export const businessProfileSchema = z.object({
  business: partySchema,
  payment: paymentDetailsSchema,
  onboardingComplete: z.boolean(),
})

/** Logos are stored resized, as PNG (keeps transparency) or JPEG (photos), which PDFs can embed. */
export const logoSchema = z.object({
  dataUrl: z.string().regex(/^data:image\/(png|jpeg);base64,/),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

const emailSchema = z.email()
const httpsLinkSchema = z.url({ protocol: /^https?$/ })

export type BusinessIssues = Partial<Record<'name' | 'email', string>>

/** Problems that stop business details from being used on an invoice. */
export function businessIssues(business: Party): BusinessIssues {
  const issues: BusinessIssues = {}
  if (!business.name.trim()) issues.name = 'Enter your business or trading name.'
  if (business.email.trim() && !emailSchema.safeParse(business.email.trim()).success) {
    issues.email = 'Enter a valid email, e.g. hello@acme.studio.'
  }
  return issues
}

export function paymentLinkIssue(link: string): string | undefined {
  if (!link.trim() || httpsLinkSchema.safeParse(link.trim()).success) return undefined
  return 'Enter a full link starting with https://'
}

export const settingsSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  locale: z.string().min(2),
  taxMode: z.enum(TAX_MODES),
  taxLabel: z.string().trim(),
  /** Applied to new line items. Empty means no tax. */
  defaultTaxRate: percentSchema,
  /** Days from issue date to due date, e.g. 14 for "Net 14". */
  paymentTermsDays: z.number().int().min(0).max(365),
  numberPattern: z.string().trim().min(1),
  /** Sequence number the next downloaded invoice will use. */
  nextSequence: z.number().int().min(1),
  templateId: z.enum(TEMPLATE_IDS),
})

export const clientSchema = partySchema.extend({
  id: z.string().min(1),
  createdAt: z.iso.datetime(),
})

export const HISTORY_STATUSES = ['unpaid', 'paid'] as const

/**
 * What an invoice was printed with besides its own data. Logos are large, so entries point to
 * one shared copy (by id) instead of each holding their own.
 */
export const issuedWithSchema = z.object({
  payment: paymentDetailsSchema,
  logoId: z.string().min(1).nullable(),
})

/** A downloaded invoice, frozen as it was issued so later profile edits don't change it. */
export const historyEntrySchema = z.object({
  id: z.string().min(1),
  invoice: invoiceSchema,
  /**
   * Null for invoices saved before payment details and logos were kept with them: those
   * print with the current ones.
   */
  issuedWith: issuedWithSchema.nullable(),
  savedAt: z.iso.datetime(),
  status: z.enum(HISTORY_STATUSES),
  paidAt: z.iso.date().nullable(),
})

export type PaymentDetails = z.infer<typeof paymentDetailsSchema>
export type QrMethod = (typeof QR_METHODS)[number]
export type BusinessProfile = z.infer<typeof businessProfileSchema>
export type Logo = z.infer<typeof logoSchema>
export type Settings = z.infer<typeof settingsSchema>
export type Client = z.infer<typeof clientSchema>
export type IssuedWith = z.infer<typeof issuedWithSchema>
export type HistoryEntry = z.infer<typeof historyEntrySchema>
export type HistoryStatus = (typeof HISTORY_STATUSES)[number]
