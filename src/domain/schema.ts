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

export const TEMPLATE_IDS = ['modern', 'classic', 'minimal'] as const
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
})

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
})

export type Party = z.infer<typeof partySchema>
export type Discount = z.infer<typeof discountSchema>
export type LineItem = z.infer<typeof lineItemSchema>
export type Invoice = z.infer<typeof invoiceSchema>
export type TemplateId = (typeof TEMPLATE_IDS)[number]
export type TaxMode = (typeof TAX_MODES)[number]
