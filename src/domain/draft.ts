import { addDays, daysBetween } from './dates'
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
    unit: '',
    code: '',
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
    // Prices are always entered before tax; "tax included" now lowers them (see pricing.ts).
    taxMode: 'exclusive',
    taxLabel: settings.taxLabel,
    from: { ...business },
    to: emptyParty(),
    items: [createLineItem(lineId, settings.defaultTaxRate)],
    discount: { type: 'none', value: '' },
    amountPaid: '',
    notes: '',
    templateId: settings.templateId,
    title: settings.documentTitle,
    taxIdLabel: settings.taxIdLabel,
    amountInWords: settings.amountInWords,
    country: settings.country,
    poNumber: '',
    supplyDate: '',
    dueMode: settings.dueMode,
    paymentTermsDays: settings.paymentTermsDays,
    payment: null,
    signed: settings.signInvoices,
    showLineTax: settings.showLineTax,
  }
}

/**
 * Carry a change of defaults over to the draft: every field still at the old default takes the
 * new one, and anything changed on the invoice itself is left alone. Returns the same invoice
 * when nothing applies.
 */
export function followDefaults(invoice: Invoice, before: Settings, after: Settings): Invoice {
  const next = { ...invoice }
  let changed = false
  const follow = <K extends keyof Invoice>(key: K, was: Invoice[K], now: Invoice[K]) => {
    if (invoice[key] === was && was !== now) {
      next[key] = now
      changed = true
    }
  }
  follow('currency', before.currency, after.currency)
  follow('locale', before.locale, after.locale)
  follow('taxLabel', before.taxLabel, after.taxLabel)
  follow('templateId', before.templateId, after.templateId)
  follow('title', before.documentTitle, after.documentTitle)
  follow('taxIdLabel', before.taxIdLabel, after.taxIdLabel)
  follow('amountInWords', before.amountInWords, after.amountInWords)
  follow('country', before.country, after.country)
  follow('dueMode', before.dueMode, after.dueMode)
  follow('paymentTermsDays', before.paymentTermsDays, after.paymentTermsDays)
  follow('signed', before.signInvoices, after.signInvoices)
  follow('showLineTax', before.showLineTax, after.showLineTax)
  follow(
    'dueDate',
    addDays(invoice.issueDate, before.paymentTermsDays),
    addDays(invoice.issueDate, after.paymentTermsDays),
  )
  follow(
    'number',
    formatInvoiceNumber(before.numberPattern, before.nextSequence, invoice.issueDate),
    formatInvoiceNumber(after.numberPattern, after.nextSequence, invoice.issueDate),
  )
  if (before.defaultTaxRate !== after.defaultTaxRate) {
    const items = invoice.items.map((item) =>
      item.taxRate === before.defaultTaxRate ? { ...item, taxRate: after.defaultTaxRate } : item,
    )
    if (items.some((item, i) => item !== invoice.items[i])) {
      next.items = items
      changed = true
    }
  }
  return changed ? next : invoice
}

type DuplicateInput = Omit<DraftInput, 'lineId'> & {
  source: Invoice
  /** A new id for each line item. */
  newLineId: () => string
}

/**
 * A new draft copied from an earlier invoice: same client, items, notes and terms, but the next
 * number, today's date, the current business and payment details, no purchase order or supply
 * date, and nothing paid yet.
 */
export function duplicateInvoice({
  source,
  id,
  newLineId,
  today,
  settings,
  business,
}: DuplicateInput): Invoice {
  const copy = structuredClone(source)
  return {
    ...copy,
    id,
    number: formatInvoiceNumber(settings.numberPattern, settings.nextSequence, today),
    issueDate: today,
    dueDate: addDays(today, Math.max(0, daysBetween(source.issueDate, source.dueDate))),
    from: { ...business },
    items: copy.items.map((item) => ({ ...item, id: newLineId() })),
    amountPaid: '',
    poNumber: '',
    supplyDate: '',
    payment: null,
  }
}
