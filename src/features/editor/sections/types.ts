import type { Invoice } from '../../../domain/schema'

/** Applies a change to the draft invoice; each call is saved immediately. */
export type InvoiceUpdater = (change: (invoice: Invoice) => Invoice) => void
