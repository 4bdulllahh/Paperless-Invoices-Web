import { z } from 'zod'
import { MONEY_SCALE, QUANTITY_SCALE, RATE_SCALE } from './decimal'

// Zod can compile validators with `new Function`, which the site's Content-Security-Policy
// forbids (it would report a violation on every load). The plain path is plenty fast here.
z.config({ jitless: true })

/**
 * Invoice data model. Numbers are stored as the decimal strings the user typed and only
 * converted to exact integers by the calculation engine (see calc.ts).
 */

const decimalString = (maxDecimals: number, message = 'Enter a number') =>
  z
    .string()
    .trim()
    .regex(new RegExp(`^(?:\\d+\\.?\\d{0,${maxDecimals}}|\\.\\d{1,${maxDecimals}})?$`), message)

export const quantitySchema = decimalString(QUANTITY_SCALE, 'Enter a quantity, e.g. 1 or 2.5')
export const moneySchema = decimalString(MONEY_SCALE, 'Enter an amount, e.g. 49.99')
export const percentSchema = decimalString(RATE_SCALE, 'Enter a percentage, e.g. 20 or 8.875')

export const TEMPLATE_IDS = [
  'modern',
  'classic',
  'minimal',
  'bold',
  'corporate',
  'compact',
] as const
export const TAX_MODES = ['exclusive', 'inclusive'] as const
export const DISCOUNT_TYPES = ['none', 'percent', 'fixed'] as const

export const discountSchema = z
  .object({
    type: z.enum(DISCOUNT_TYPES),
    value: z.string().trim(),
  })
  .superRefine((discount, ctx) => {
    if (discount.type === 'none') return
    const result = (discount.type === 'percent' ? percentSchema : moneySchema).safeParse(
      discount.value,
    )
    if (!result.success) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: result.error.issues[0].message })
    } else if (discount.type === 'percent' && Number(discount.value) > 100) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'A discount can’t exceed 100%' })
    }
  })

/** Ways a client can pay, printed on invoices as "Accepted: Bank transfer · Card…". */
export const PAYMENT_METHODS = ['bank', 'card', 'cash', 'cheque'] as const

/** What the QR code on an invoice does when scanned, if there is one. */
export const QR_METHODS = ['link', 'upi', 'sepa', 'none'] as const

/**
 * How clients pay. The QR details are plain strings here: a mistyped IBAN only means no QR code,
 * never a profile that fails to load. Saved as the business default, and on an invoice whose
 * payment details were changed for that invoice alone.
 */
export const paymentDetailsSchema = z.object({
  /** Free text printed on invoices, under the bank details. */
  instructions: z.string(),
  /** Optional https link a client can pay at (PayPal, Stripe, Wise…). */
  link: z.string().trim(),
  qr: z.enum(QR_METHODS),
  /** UPI ID for rupee invoices, e.g. acmestudio@okhdfcbank. */
  upiId: z.string().trim(),
  /** Printed with the bank details, and used for SEPA QR codes on euro invoices. */
  iban: z.string().trim(),
  /** SWIFT/BIC. Optional within the SEPA area. */
  bic: z.string().trim(),
  /** Accepted payment methods (added in 1.1; the default keeps older profiles valid). */
  methods: z.array(z.enum(PAYMENT_METHODS)).default([]),
  /** Bank details, added in 1.2. */
  bankName: z.string().trim().default(''),
  accountName: z.string().trim().default(''),
  accountNumber: z.string().trim().default(''),
})

export const partySchema = z.object({
  name: z.string().trim(),
  email: z.string().trim(),
  phone: z.string().trim(),
  /** Free-form, one line per address line. */
  address: z.string(),
  /** VAT/GST/tax registration number. */
  taxId: z.string().trim(),
})

export const lineItemSchema = z.object({
  id: z.string().min(1),
  description: z.string(),
  quantity: quantitySchema,
  unitPrice: moneySchema,
  /** Percentage, e.g. "20". Empty means no tax. */
  taxRate: percentSchema,
  discount: discountSchema,
  /** Unit of measure, e.g. "Pcs", "Sets", "Hrs" (added in 1.2). */
  unit: z.string().trim().default(''),
  /** Product or service code where the law asks for one, e.g. HSN/SAC in India (added in 1.2). */
  code: z.string().trim().default(''),
})

/** A due date, or payment terms ("Net 30 days") printed in its place. */
export const DUE_MODES = ['date', 'terms'] as const

export const invoiceSchema = z.object({
  id: z.string().min(1),
  number: z.string().trim(),
  issueDate: z.iso.date(),
  dueDate: z.iso.date(),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code, e.g. USD'),
  /** BCP 47 locale used for number and date formatting, e.g. "en-GB". */
  locale: z.string().min(2),
  /** Exclusive: tax is added on top. Inclusive: prices already contain tax. */
  taxMode: z.enum(TAX_MODES),
  /** Shown on the invoice, e.g. "VAT", "GST", "Sales tax". */
  taxLabel: z.string().trim(),
  from: partySchema,
  to: partySchema,
  items: z.array(lineItemSchema),
  discount: discountSchema,
  amountPaid: moneySchema,
  notes: z.string(),
  templateId: z.enum(TEMPLATE_IDS),
  /**
   * The fields below were added in version 1.1. Their defaults fill them in for invoices saved
   * before, so no migration is needed.
   */
  /** Printed as the heading, e.g. "Invoice" or "Tax invoice" where the law asks for it. */
  title: z.string().trim().default('Invoice'),
  /** How tax numbers are labelled for the sender's country, e.g. "TRN", "GSTIN", "VAT no.". */
  taxIdLabel: z.string().trim().default('Tax ID'),
  /** Print the total in words, e.g. "One thousand US dollars only". */
  amountInWords: z.boolean().default(false),
  /**
   * Added in 1.2, again with defaults that leave older invoices printing exactly as they did.
   */
  /** Whose rules the invoice follows, as an ISO code (e.g. "AE"); empty when unknown. */
  country: z.string().default(''),
  /** The client's purchase order (LPO in the Gulf). */
  poNumber: z.string().trim().default(''),
  /** When the goods or services were supplied, if not on the issue date. */
  supplyDate: z.union([z.iso.date(), z.literal('')]).default(''),
  dueMode: z.enum(DUE_MODES).default('date'),
  /** Days from the issue date to the due date; 0 is "on delivery". */
  paymentTermsDays: z.number().int().min(0).max(365).default(30),
  /** Payment details changed for this invoice only; null uses the business defaults. */
  payment: paymentDetailsSchema.nullable().default(null),
  /** Print the signature and stamp, or a line to sign on. */
  signed: z.boolean().default(false),
  /**
   * Show the tax rate and amount on every line, as Gulf and Indian tax invoices do. Tax is then
   * rounded line by line, so the printed lines add up to the totals.
   */
  showLineTax: z.boolean().default(false),
})

export type Party = z.infer<typeof partySchema>
export type Discount = z.infer<typeof discountSchema>
export type LineItem = z.infer<typeof lineItemSchema>
export type Invoice = z.infer<typeof invoiceSchema>
export type TemplateId = (typeof TEMPLATE_IDS)[number]
export type TaxMode = (typeof TAX_MODES)[number]
export type DueMode = (typeof DUE_MODES)[number]
export type PaymentDetails = z.infer<typeof paymentDetailsSchema>
export type QrMethod = (typeof QR_METHODS)[number]
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
