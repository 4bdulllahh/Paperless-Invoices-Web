import { calculateTotals } from './calc'
import { countryInSentence } from './countries'
import type { ExportIssue } from './export'
import type { Invoice } from './schema'

/**
 * What the law in each country asks a (tax) invoice to show, beyond what every invoice needs.
 * Missing items are warnings: the user can still download, but is told first.
 *
 * Sources: UAE Federal Decree-Law 8/2017 art. 65 and Executive Regulation art. 59 (FTA); EU VAT
 * Directive art. 226; UK HMRC VAT Notice 700/21; Saudi, Bahraini and Omani VAT regulations;
 * Australian GST Act s29-70; NZ GST Act s19F (taxable supply information); Singapore GST
 * General Regulations; Indian CGST Rules rule 46; South African VAT Act s20; Japan's qualified
 * invoice system; Canada's Input Tax Credit Information Regulations.
 */
type Rule = {
  /** The seller's tax number: on every invoice, or whenever tax is charged. */
  sellerTaxId?: 'always' | 'taxed'
  /** Both parties' addresses. */
  addresses?: boolean
  /** The client's tax number, when they're registered themselves. */
  buyerTaxId?: boolean
  /** Above this total (in the country's currency), the client's address too. */
  buyerDetailsAbove?: number
  /** And above it, the client's tax number if they're registered. */
  buyerTaxIdWhenLarge?: boolean
  title?: 'Tax Invoice'
  /** Tax must be stated in this currency. */
  taxCurrency?: string
  signature?: boolean
  /** A product or service code on each line, e.g. HSN/SAC. */
  itemCode?: string
  maxNumberLength?: number
  /** How a valid tax number looks, once spaces, dots and dashes are removed. */
  taxIdPattern?: RegExp
  /** Said when a number doesn't match, e.g. "15 digits". */
  taxIdFormat?: string
  /** Shown as the field's placeholder. */
  taxIdExample?: string
}

const BASIC: Rule = { sellerTaxId: 'taxed', addresses: true }
const GULF: Rule = {
  sellerTaxId: 'always',
  addresses: true,
  buyerTaxId: true,
  title: 'Tax Invoice',
}

const EUROPE = [
  ...['AT', 'BE', 'BG', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT'],
  ...['LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'CZ', 'DK', 'HU', 'PL', 'RO', 'SE'],
  ...['CH', 'NO', 'IS', 'TR'],
]
const OTHERS_WITH_TAX = [
  ...['MX', 'BR', 'MY', 'PH', 'TH', 'KR', 'TW', 'BD', 'LK', 'NP', 'PK', 'EG', 'JO', 'IL'],
  ...['NG', 'KE'],
]

const RULES: Record<string, Rule> = {
  ...Object.fromEntries([...EUROPE, ...OTHERS_WITH_TAX].map((code) => [code, BASIC])),
  AE: {
    ...GULF,
    taxCurrency: 'AED',
    taxIdPattern: /^\d{15}$/,
    taxIdFormat: '15 digits',
    taxIdExample: '100123456700003',
  },
  SA: {
    ...GULF,
    taxCurrency: 'SAR',
    taxIdPattern: /^3\d{13}3$/,
    taxIdFormat: '15 digits, starting and ending with 3',
    taxIdExample: '310123456700003',
  },
  BH: { ...GULF, taxCurrency: 'BHD', taxIdPattern: /^\d{15}$/, taxIdFormat: '15 digits' },
  OM: {
    ...GULF,
    taxCurrency: 'OMR',
    taxIdPattern: /^OM\d{10}$/,
    taxIdFormat: 'OM followed by 10 digits',
    taxIdExample: 'OM1100012345',
  },
  GB: {
    ...BASIC,
    taxIdPattern: /^(GB)?(\d{9}|\d{12})$/,
    taxIdFormat: '9 digits, e.g. GB123456789',
    taxIdExample: 'GB123456789',
  },
  AU: {
    sellerTaxId: 'taxed',
    title: 'Tax Invoice',
    buyerDetailsAbove: 1000,
    taxIdPattern: /^\d{11}$/,
    taxIdFormat: '11 digits',
    taxIdExample: '51 824 753 556',
  },
  NZ: {
    sellerTaxId: 'taxed',
    buyerDetailsAbove: 1000,
    taxIdPattern: /^\d{8,9}$/,
    taxIdFormat: '8 or 9 digits',
    taxIdExample: '123-456-789',
  },
  SG: { ...BASIC, title: 'Tax Invoice' },
  IN: {
    ...BASIC,
    title: 'Tax Invoice',
    buyerTaxId: true,
    signature: true,
    itemCode: 'HSN/SAC',
    maxNumberLength: 16,
    taxIdPattern: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
    taxIdFormat: '15 characters, e.g. 27AAPFU0939F1ZV',
    taxIdExample: '27AAPFU0939F1ZV',
  },
  ZA: {
    sellerTaxId: 'taxed',
    title: 'Tax Invoice',
    buyerDetailsAbove: 5000,
    buyerTaxIdWhenLarge: true,
    taxIdPattern: /^4\d{9}$/,
    taxIdFormat: '10 digits starting with 4',
    taxIdExample: '4123456789',
  },
  JP: {
    sellerTaxId: 'taxed',
    taxIdPattern: /^T\d{13}$/,
    taxIdFormat: 'T followed by 13 digits',
    taxIdExample: 'T1234567890123',
  },
  CA: {
    sellerTaxId: 'taxed',
    taxIdPattern: /^\d{9}(RT\d{4})?$/,
    taxIdFormat: '9 digits, or 9 digits and RT0001',
    taxIdExample: '123456789RT0001',
  },
}

/** What the tax number fields should say for a country. */
export type TaxIdRules = {
  /** The seller's number is required on every invoice there (the UAE). */
  required: boolean
  /** Placeholder, e.g. "100123456700003"; empty when there's no single format. */
  example: string
  /** Whether the country's rules name an item code column, and what it's called. */
  itemCode: string
}

export function taxIdRules(country: string): TaxIdRules {
  const rule = RULES[country] ?? {}
  return {
    required: rule.sellerTaxId === 'always',
    example: rule.taxIdExample ?? '',
    itemCode: rule.itemCode ?? '',
  }
}

const compact = (value: string) => value.replace(/[\s.\-/]/g, '').toUpperCase()

/**
 * Why a typed tax number looks wrong, or undefined. Catches the label typed in with it
 * ("TRN100…") and, where the format is fixed, the wrong length or shape.
 */
export function taxIdIssue(country: string, value: string, label: string): string | undefined {
  const typed = compact(value)
  if (!typed) return undefined
  const rule = RULES[country] ?? {}
  if (rule.taxIdPattern?.test(typed)) return undefined
  const labelWord = compact(label.split(/\s/)[0]).replace(/[^A-Z]/g, '')
  if (labelWord.length >= 2 && typed.startsWith(labelWord)) {
    return `Enter just the number, without “${label.split(/\s/)[0]}”.`
  }
  if (rule.taxIdFormat) return `A ${label} is ${rule.taxIdFormat}.`
  return undefined
}

/** Legal requirements this invoice doesn't meet yet, in editor order. Empty when none apply. */
export function complianceIssues(invoice: Invoice): ExportIssue[] {
  const rule = RULES[invoice.country]
  if (!rule) return []
  const issues: ExportIssue[] = []
  const add = (section: ExportIssue['section'], message: string) =>
    issues.push({ section, message, legal: true })
  const where = countryInSentence(invoice.country)
  const label = invoice.taxIdLabel || 'tax number'
  const totals = calculateTotals(invoice)
  const taxed = totals.taxTotal > 0
  const large =
    rule.buyerDetailsAbove !== undefined &&
    totals.total >= rule.buyerDetailsAbove * 10 ** totals.digits
  const { from, to } = invoice

  // Bill to
  if ((rule.addresses || large) && !to.address.trim()) {
    add('billTo', 'Add the client’s address.')
  }
  const buyerTaxId = rule.buyerTaxId || (large && rule.buyerTaxIdWhenLarge)
  if (buyerTaxId && taxed && !to.taxId.trim()) {
    add(
      'billTo',
      `Add the client’s ${label} if they’re registered for ${invoice.taxLabel || 'tax'}.`,
    )
  }
  const buyerIdIssue = taxIdIssue(invoice.country, to.taxId, label)
  if (buyerIdIssue) add('billTo', `Client: ${buyerIdIssue}`)

  // Items
  if (rule.itemCode && invoice.items.some((item) => item.unitPrice.trim() && !item.code.trim())) {
    add('items', `Add an ${rule.itemCode} code to each item.`)
  }

  // Title, number & dates
  if (rule.title && invoice.title.trim().toLowerCase() !== rule.title.toLowerCase()) {
    add('invoice', `Title it “${rule.title}”, as the law in ${where} requires.`)
  }
  if (rule.maxNumberLength && invoice.number.trim().length > rule.maxNumberLength) {
    add('invoice', `Keep the invoice number to ${rule.maxNumberLength} characters or fewer.`)
  }
  if (rule.taxCurrency && taxed && invoice.currency !== rule.taxCurrency) {
    add(
      'invoice',
      `${invoice.taxLabel || 'Tax'} must be stated in ${rule.taxCurrency}. Switch the currency, or add the ${rule.taxCurrency} amount and exchange rate to the notes.`,
    )
  }

  // From
  if (
    (rule.sellerTaxId === 'always' || (rule.sellerTaxId === 'taxed' && taxed)) &&
    !from.taxId.trim()
  ) {
    add(
      'from',
      `Add your ${label}. ${taxed ? 'Tax invoices' : 'Invoices'} in ${where} must show it.`,
    )
  }
  const sellerIdIssue = taxIdIssue(invoice.country, from.taxId, label)
  if (sellerIdIssue) add('from', `Yours: ${sellerIdIssue}`)
  if (rule.addresses && !from.address.trim()) add('from', 'Add your business address.')
  if (rule.signature && !invoice.signed) {
    add('from', `Sign the invoice: tax invoices in ${where} need an authorised signature.`)
  }

  return issues
}
