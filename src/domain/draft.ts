import { addDays } from './dates'
import { formatInvoiceNumber } from './numbering'
import type { Settings } from './records'
import type { Invoice, LineItem, Party } from './schema'

export function emptyParty(): Party {
  return { name: '', email: '', phone: '', address: '', taxId: '' }
}

export function sameParty(a: Party, b: Party): boolean {
  return (Object.keys(a) as (keyof Party)[]).every((key) => a[key] === b[key])
}

/** True until the user has started filling the invoice in, so it can be safely replaced. */
export function isPristineDraft(invoice: Invoice): boolean {
  return (
    !invoice.to.name.trim() &&
    !invoice.to.email.trim() &&
    !invoice.notes.trim() &&
    invoice.items.every((item) => !item.description.trim() && !item.unitPrice.trim())
  )
}

export function createLineItem(id: string, taxRate = ''): LineItem {
  return {
    id,
    description: '',
    quantity: '1',
    unitPrice: '',
    taxRate,
    discount: { type: 'none', value: '' },
  }
}

type DraftInput = {
  /** New ids for the invoice and its first line. */
  id: string
  lineId: string
  today: string
  settings: Settings
  business: Party
}

/**
 * A fresh invoice with the user's defaults filled in. The number is provisional: the sequence
 * is only claimed when the invoice is downloaded, so abandoned drafts don't use up numbers.
 */
export function createInvoiceDraft({ id, lineId, today, settings, business }: DraftInput): Invoice {
  return {
    id,
    number: formatInvoiceNumber(settings.numberPattern, settings.nextSequence, today),
    issueDate: today,
    dueDate: addDays(today, settings.paymentTermsDays),
    currency: settings.currency,
    locale: settings.locale,
    taxMode: settings.taxMode,
    taxLabel: settings.taxLabel,
    from: { ...business },
    to: emptyParty(),
    items: [createLineItem(lineId, settings.defaultTaxRate)],
    discount: { type: 'none', value: '' },
    amountPaid: '',
    notes: '',
    templateId: settings.templateId,
  }
}
