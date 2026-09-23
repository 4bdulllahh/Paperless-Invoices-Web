import type { Settings } from './records'

/**
 * Invoice conventions by country: currency, number and date format, what sales tax is called and
 * its standard rate, how tax numbers are labelled, and whether invoices must be titled
 * "Tax invoice". Standard rates as of 2026; many countries also have reduced rates, so every
 * value stays editable.
 *
 * Locales are English variants with the country's number and date style. Native locales could
 * print scripts the PDF fonts don't cover (Arabic digits, Thai years, Greek month names).
 */
export type CountryPreset = {
  /** ISO 3166-1 alpha-2, e.g. "AE". */
  code: string
  currency: string
  locale: string
  /** Empty where there's no sales tax or VAT. */
  taxLabel: string
  /** Standard rate; empty when there's none or it varies by region. */
  taxRate: string
  taxIdLabel: string
  title: 'Invoice' | 'Tax invoice'
  /** Customary to write the total in words (South Asia, the Gulf). */
  amountInWords: boolean
  /** Something the user should know before relying on a PDF invoice there. */
  note?: string
}

type Row = [
  code: string,
  currency: string,
  locale: string,
  taxLabel: string,
  taxRate: string,
  taxIdLabel: string,
  extras?: { title?: 'Tax invoice'; words?: true; note?: string },
]

const TAX_INVOICE = 'Tax invoice' as const
const EU = (code: string, rate: string, locale = 'en-150', note?: string): Row => [
  code,
  'EUR',
  locale,
  'VAT',
  rate,
  'VAT no.',
  note ? { note } : undefined,
]
const GULF = { words: true } as const

const ROWS: Row[] = [
  // European Union (euro area)
  EU('AT', '20', 'en-AT'),
  EU(
    'BE',
    '21',
    'en-BE',
    'Belgian businesses must send B2B invoices as structured e-invoices (Peppol) since 2026. Use Paperless for consumer invoices, quotes or records.',
  ),
  EU('BG', '20'),
  EU(
    'HR',
    '25',
    'en-150',
    'Croatia requires B2B invoices to be sent as e-invoices and reported (Fiscalization 2.0) from 2026.',
  ),
  EU('CY', '19', 'en-CY'),
  EU('EE', '24'),
  EU('FI', '25.5', 'en-FI'),
  EU(
    'FR',
    '20',
    'en-150',
    'France is phasing in mandatory B2B e-invoicing from September 2026; check which phase applies to you.',
  ),
  EU(
    'DE',
    '19',
    'en-DE',
    'German B2B invoices must become e-invoices (XRechnung or ZUGFeRD) by 2027–28; PDFs are allowed during the transition.',
  ),
  EU('GR', '24'),
  EU('IE', '23', 'en-IE'),
  EU(
    'IT',
    '22',
    'en-150',
    'Italian invoices must be issued electronically through SdI; a PDF alone isn’t a valid invoice there. Use Paperless for quotes and proforma invoices.',
  ),
  EU('LV', '21'),
  EU('LT', '21'),
  EU('LU', '17'),
  EU('MT', '18', 'en-MT'),
  EU('NL', '21', 'en-NL'),
  EU(
    'PT',
    '23',
    'en-150',
    'Portugal requires invoices to come from certified invoicing software. Use Paperless for quotes or records.',
  ),
  EU('SK', '23'),
  EU('SI', '22', 'en-SI'),
  EU('ES', '21'),
  // European Union (other currencies)
  ['CZ', 'CZK', 'en-150', 'VAT', '21', 'VAT no.'],
  ['DK', 'DKK', 'en-DK', 'VAT', '25', 'CVR no.'],
  [
    'HU',
    'HUF',
    'en-150',
    'VAT',
    '27',
    'VAT no.',
    { note: 'Hungarian invoices must be reported to the tax authority (NAV) in real time.' },
  ],
  [
    'PL',
    'PLN',
    'en-150',
    'VAT',
    '23',
    'NIP',
    { note: 'Poland’s national e-invoicing system (KSeF) is mandatory from 2026.' },
  ],
  [
    'RO',
    'RON',
    'en-150',
    'VAT',
    '21',
    'CUI',
    { note: 'Romanian B2B invoices must also be reported through RO e-Factura.' },
  ],
  ['SE', 'SEK', 'en-SE', 'VAT', '25', 'VAT no.'],
  // Rest of Europe
  ['GB', 'GBP', 'en-GB', 'VAT', '20', 'VAT reg. no.'],
  ['CH', 'CHF', 'en-CH', 'VAT', '8.1', 'VAT no.'],
  ['NO', 'NOK', 'en-150', 'VAT', '25', 'Org. no.'],
  ['IS', 'ISK', 'en-150', 'VAT', '24', 'VAT no.'],
  [
    'TR',
    'TRY',
    'en-150',
    'VAT',
    '20',
    'Tax no.',
    { note: 'Many Turkish businesses must issue e-invoices (e-Fatura or e-Arşiv).' },
  ],
  // Americas
  [
    'US',
    'USD',
    'en-US',
    'Sales tax',
    '',
    'EIN',
    { note: 'Sales tax depends on your state and city. Add your rate if you collect it.' },
  ],
  [
    'CA',
    'CAD',
    'en-CA',
    'GST/HST',
    '5',
    'GST/HST no.',
    { note: 'GST is 5%; HST provinces charge 13–15% instead. Set the rate for your province.' },
  ],
  [
    'MX',
    'MXN',
    'es-MX',
    'IVA',
    '16',
    'RFC',
    { note: 'Mexican tax invoices must be official e-invoices (CFDI). Use Paperless for quotes.' },
  ],
  [
    'BR',
    'BRL',
    'pt-BR',
    'Tax',
    '',
    'CNPJ',
    {
      note: 'Brazilian invoices must be official e-invoices (NF-e or NFS-e). Use Paperless for quotes.',
    },
  ],
  // Asia and the Pacific
  ['AU', 'AUD', 'en-AU', 'GST', '10', 'ABN', { title: TAX_INVOICE }],
  ['NZ', 'NZD', 'en-NZ', 'GST', '15', 'GST no.', { title: TAX_INVOICE }],
  [
    'IN',
    'INR',
    'en-IN',
    'GST',
    '18',
    'GSTIN',
    {
      title: TAX_INVOICE,
      words: true,
      note: 'Within your state GST is shown as CGST + SGST (half each); between states it’s IGST. Larger businesses must also register e-invoices (IRN).',
    },
  ],
  [
    'PK',
    'PKR',
    'en-PK',
    'Sales tax',
    '18',
    'NTN',
    {
      words: true,
      note: 'Services are taxed by your province, usually at 15–16%. Set the rate that applies to you.',
    },
  ],
  ['BD', 'BDT', 'en-IN', 'VAT', '15', 'BIN', { words: true }],
  ['LK', 'LKR', 'en-GB', 'VAT', '18', 'VAT no.', { words: true }],
  ['NP', 'NPR', 'en-IN', 'VAT', '13', 'PAN', { words: true }],
  ['SG', 'SGD', 'en-SG', 'GST', '9', 'GST reg. no.', { title: TAX_INVOICE }],
  [
    'MY',
    'MYR',
    'en-MY',
    'Service tax',
    '8',
    'SST no.',
    { note: 'Malaysia is phasing in mandatory e-invoicing through MyInvois.' },
  ],
  ['PH', 'PHP', 'en-PH', 'VAT', '12', 'TIN'],
  ['TH', 'THB', 'en-GB', 'VAT', '7', 'Tax ID'],
  ['JP', 'JPY', 'en-US', 'Consumption tax', '10', 'Registration no.'],
  ['KR', 'KRW', 'en-US', 'VAT', '10', 'Business reg. no.'],
  ['TW', 'TWD', 'en-US', 'Business tax', '5', 'Business no.'],
  [
    'HK',
    'HKD',
    'en-HK',
    '',
    '',
    'BR no.',
    { note: 'Hong Kong has no sales tax or VAT, so invoices show no tax.' },
  ],
  // Middle East and Africa
  [
    'AE',
    'AED',
    'en-AE',
    'VAT',
    '5',
    'TRN',
    {
      title: TAX_INVOICE,
      words: true,
      note: 'VAT-registered businesses must show their TRN on tax invoices, and the client’s TRN if they’re registered too.',
    },
  ],
  [
    'SA',
    'SAR',
    'en-AE',
    'VAT',
    '15',
    'VAT no.',
    {
      title: TAX_INVOICE,
      words: true,
      note: 'Saudi tax invoices must come from ZATCA-compliant e-invoicing software (Fatoora). Use Paperless for quotes or records.',
    },
  ],
  ['BH', 'BHD', 'en-AE', 'VAT', '10', 'VAT account no.', { title: TAX_INVOICE, words: true }],
  ['OM', 'OMR', 'en-AE', 'VAT', '5', 'VATIN', { title: TAX_INVOICE, words: true }],
  ['QA', 'QAR', 'en-AE', '', '', 'Tax ID', { ...GULF, note: 'Qatar has no VAT yet.' }],
  ['KW', 'KWD', 'en-AE', '', '', 'Tax ID', { ...GULF, note: 'Kuwait has no VAT yet.' }],
  ['JO', 'JOD', 'en-AE', 'Sales tax', '16', 'Tax no.', GULF],
  [
    'EG',
    'EGP',
    'en-AE',
    'VAT',
    '14',
    'Tax reg. no.',
    { words: true, note: 'Registered Egyptian businesses must issue e-invoices through the ETA.' },
  ],
  ['IL', 'ILS', 'en-IL', 'VAT', '18', 'Business no.'],
  ['ZA', 'ZAR', 'en-ZA', 'VAT', '15', 'VAT no.', { title: TAX_INVOICE }],
  ['NG', 'NGN', 'en-NG', 'VAT', '7.5', 'TIN'],
  [
    'KE',
    'KES',
    'en-KE',
    'VAT',
    '16',
    'PIN',
    { note: 'Kenyan invoices must be issued through KRA’s eTIMS system.' },
  ],
]

export const COUNTRY_PRESETS: readonly CountryPreset[] = ROWS.map(
  ([code, currency, locale, taxLabel, taxRate, taxIdLabel, extras]) => ({
    code,
    currency,
    locale,
    taxLabel,
    taxRate,
    taxIdLabel,
    title: extras?.title ?? 'Invoice',
    amountInWords: extras?.words ?? false,
    ...(extras?.note && { note: extras.note }),
  }),
)

export function findCountry(code: string): CountryPreset | undefined {
  return COUNTRY_PRESETS.find((country) => country.code === code)
}

/** "United Arab Emirates", in English (the invoice language). */
export function countryName(code: string): string {
  // With the default fallback ('code'), of() returns the code itself for unknown regions.
  return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) as string
}

/** Every country with a preset, alphabetically by name, for a picker. */
export function countryOptions(): { value: string; label: string }[] {
  return COUNTRY_PRESETS.map(({ code }) => ({ value: code, label: countryName(code) })).sort(
    (a, b) => a.label.localeCompare(b.label),
  )
}

/** The settings a country implies. Fields the user sets themselves (terms, numbering) are left. */
export function countrySettings(preset: CountryPreset): Partial<Settings> {
  return {
    country: preset.code,
    currency: preset.currency,
    locale: preset.locale,
    taxLabel: preset.taxLabel,
    defaultTaxRate: preset.taxRate,
    taxIdLabel: preset.taxIdLabel,
    documentTitle: preset.title,
    amountInWords: preset.amountInWords,
  }
}
