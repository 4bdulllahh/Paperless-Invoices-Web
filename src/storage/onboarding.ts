import { addDays, todayIso } from '../domain/dates'
import { isPristineDraft } from '../domain/draft'
import { DEFAULT_NUMBER_PATTERN, formatInvoiceNumber } from '../domain/numbering'
import { emptyPaymentDetails, type Settings } from '../domain/records'
import { createSampleInvoice } from '../domain/sample'
import { useDraftStore, useProfileStore, useSettingsStore } from './stores'

/**
 * Close the setup wizard. The current draft is rebuilt from the new defaults, unless the user
 * has already started filling it in.
 */
export function finishOnboarding(today = todayIso()) {
  const { invoice, startNewInvoice } = useDraftStore.getState()
  if (!invoice || isPristineDraft(invoice)) startNewInvoice(today)
  useProfileStore.getState().completeOnboarding()
}

const SAMPLE_SETTINGS: Settings = {
  currency: 'USD',
  locale: 'en-US',
  taxMode: 'exclusive',
  taxLabel: 'Sales tax',
  defaultTaxRate: '8.875',
  paymentTermsDays: 14,
  numberPattern: DEFAULT_NUMBER_PATTERN,
  nextSequence: 42,
  templateId: 'modern',
  country: 'US',
  documentTitle: 'Invoice',
  taxIdLabel: 'EIN',
  amountInWords: false,
  dueMode: 'date',
  showLineTax: false,
  signInvoices: false,
}

/** "Try with sample data": a fictional business and a filled-in invoice to explore. */
export function loadSampleData(today = todayIso()) {
  const sample = createSampleInvoice()
  useSettingsStore.getState().updateSettings(SAMPLE_SETTINGS)
  useProfileStore.setState({
    business: sample.from,
    payment: {
      ...emptyPaymentDetails(),
      instructions:
        'Bank: Example Bank\nAccount name: Acme Studio LLC\nAccount number: 0000 1234 5678',
      link: 'https://pay.example.com/acme-studio',
    },
    onboardingComplete: true,
  })
  useDraftStore.getState().setInvoice({
    ...sample,
    id: crypto.randomUUID(),
    number: formatInvoiceNumber(SAMPLE_SETTINGS.numberPattern, SAMPLE_SETTINGS.nextSequence, today),
    issueDate: today,
    dueDate: addDays(today, SAMPLE_SETTINGS.paymentTermsDays),
  })
}
