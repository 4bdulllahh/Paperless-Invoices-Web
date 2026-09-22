import { z } from 'zod'
import { invoiceSchema, partySchema, percentSchema, TAX_MODES, TEMPLATE_IDS } from './schema'

/**
 * Everything Paperless saves besides the invoice itself. Each schema is also what stored data
 * and imported backups are checked against before use.
 */

export const businessProfileSchema = z.object({
  business: partySchema,
  onboardingComplete: z.boolean(),
})

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

/** A downloaded invoice, frozen as it was issued so later profile edits don't change it. */
export const historyEntrySchema = z.object({
  id: z.string().min(1),
  invoice: invoiceSchema,
  savedAt: z.iso.datetime(),
  status: z.enum(HISTORY_STATUSES),
  paidAt: z.iso.date().nullable(),
})

export type BusinessProfile = z.infer<typeof businessProfileSchema>
export type Settings = z.infer<typeof settingsSchema>
export type Client = z.infer<typeof clientSchema>
export type HistoryEntry = z.infer<typeof historyEntrySchema>
export type HistoryStatus = (typeof HISTORY_STATUSES)[number]
