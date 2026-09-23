import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAllData } from '../../storage/backup'
import { useDraftStore, useProfileStore, useSettingsStore } from '../../storage/stores'
import { OnboardingWizard } from './OnboardingWizard'

const { requestPersistentStorage } = vi.hoisted(() => ({
  requestPersistentStorage: vi.fn().mockResolvedValue(true),
}))
vi.mock('../../storage/persistence', () => ({ requestPersistentStorage }))

const realOptions = Intl.DateTimeFormat.prototype.resolvedOptions

/** Where the device says it is: the time zone first, then the browser's languages. */
function deviceIn(timeZone: string, languages: string[] = []) {
  vi.restoreAllMocks()
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(function (
    this: Intl.DateTimeFormat,
  ) {
    return { ...realOptions.call(this), timeZone }
  })
  vi.spyOn(Object.getPrototypeOf(navigator), 'languages', 'get').mockReturnValue(languages)
}

beforeEach(async () => {
  requestPersistentStorage.mockClear()
  await clearAllData()
  deviceIn('Etc/UTC')
})

afterEach(() => vi.restoreAllMocks())

const next = () => fireEvent.click(screen.getByRole('button', { name: /Continue|Finish setup/ }))
const stepHeading = () => screen.getByRole('heading', { level: 2 })

const chooseCountry = (code: string) =>
  fireEvent.change(screen.getByLabelText('Country your business is in'), {
    target: { value: code },
  })

describe('OnboardingWizard', () => {
  it('starts with nothing chosen, and asks for the country first', () => {
    render(<OnboardingWizard />)
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
    expect(stepHeading()).toHaveTextContent('Where is your business?')
    expect(screen.getByLabelText('Country your business is in')).toHaveValue('')

    next()

    expect(screen.getByText('Choose your country, or “Somewhere else”.')).toBeInTheDocument()
    expect(stepHeading()).toHaveTextContent('Where is your business?')
  })

  it('fills in the country’s currency, tax and invoice rules', () => {
    render(<OnboardingWizard />)
    chooseCountry('AE')

    expect(screen.getByText(/Set up for United Arab Emirates/).closest('p')).toHaveTextContent(
      'AED · VAT 5% · tax number shown as “TRN” · titled “Tax Invoice” · VAT shown on every line · total in words',
    )
    expect(screen.getByText(/must show your TRN/)).toBeInTheDocument()
    expect(useSettingsStore.getState()).toMatchObject({
      country: 'AE',
      currency: 'AED',
      locale: 'en-AE',
      taxLabel: 'VAT',
      defaultTaxRate: '5',
      taxIdLabel: 'TRN',
      documentTitle: 'Tax Invoice',
      amountInWords: true,
      showLineTax: true,
      signInvoices: true,
    })
  })

  it('starts from the country the device is in', () => {
    deviceIn('Asia/Dubai', ['en-US'])
    render(<OnboardingWizard />)
    expect(screen.getByLabelText('Country your business is in')).toHaveValue('AE')
    expect(useSettingsStore.getState()).toMatchObject({ currency: 'AED', taxIdLabel: 'TRN' })
  })

  it('keeps a country already chosen', () => {
    useSettingsStore.getState().updateSettings({ country: 'DE' })
    deviceIn('Asia/Dubai')
    render(<OnboardingWizard />)
    expect(screen.getByLabelText('Country your business is in')).toHaveValue('DE')
  })

  it('asks for a business name before moving on', () => {
    render(<OnboardingWizard />)
    chooseCountry('OTHER')
    next()
    expect(screen.queryByText('Enter your business or trading name.')).not.toBeInTheDocument()

    next()

    expect(screen.getByText('Enter your business or trading name.')).toBeInTheDocument()
    expect(stepHeading()).toHaveTextContent('Your business')
  })

  it('walks through all four steps and fills in the first invoice', () => {
    render(<OnboardingWizard />)
    expect(stepHeading()).toHaveFocus()
    chooseCountry('DE')
    next()

    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Acme Studio' } })
    next()
    expect(stepHeading()).toHaveTextContent('Invoice defaults')
    expect(stepHeading()).toHaveFocus()
    // The country was chosen on its own step.
    expect(screen.queryByLabelText('Country your business is in')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Currency')).toHaveValue('EUR')
    next()
    expect(stepHeading()).toHaveTextContent('Getting paid')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Bank transfer' }))
    fireEvent.change(screen.getByLabelText(/Bank name/), { target: { value: 'Example Bank' } })
    fireEvent.change(screen.getByLabelText(/payment instructions/), {
      target: { value: 'Quote the invoice number' },
    })
    next()

    expect(useProfileStore.getState()).toMatchObject({
      onboardingComplete: true,
      payment: {
        bankName: 'Example Bank',
        instructions: 'Quote the invoice number',
        methods: ['bank'],
      },
    })
    expect(useDraftStore.getState().invoice).toMatchObject({
      currency: 'EUR',
      taxLabel: 'VAT',
      items: [{ taxRate: '19' }],
      taxIdLabel: 'VAT no.',
      from: { name: 'Acme Studio' },
    })
    expect(requestPersistentStorage).toHaveBeenCalledOnce()
  })

  it('can go back a step', () => {
    useProfileStore.getState().updateBusiness({ name: 'Acme Studio' })
    render(<OnboardingWizard />)
    chooseCountry('GB')
    next()
    next()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(stepHeading()).toHaveTextContent('Your business')
    expect(screen.getByLabelText('Business name')).toHaveValue('Acme Studio')
  })

  it('can be skipped', () => {
    render(<OnboardingWizard />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(useProfileStore.getState().onboardingComplete).toBe(true)
    expect(useDraftStore.getState().invoice).not.toBeNull()
  })

  it('can load sample data instead', () => {
    render(<OnboardingWizard />)
    fireEvent.click(screen.getByRole('button', { name: /sample data/i }))
    expect(useProfileStore.getState()).toMatchObject({
      onboardingComplete: true,
      business: { name: 'Acme Studio' },
    })
    expect(useDraftStore.getState().invoice?.to.name).toBe('Northwind Ltd')
  })
})
