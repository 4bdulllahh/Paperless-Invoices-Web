import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAllData } from '../../storage/backup'
import { useDraftStore, useProfileStore, useSettingsStore } from '../../storage/stores'
import { OnboardingWizard } from './OnboardingWizard'

const { requestPersistentStorage } = vi.hoisted(() => ({
  requestPersistentStorage: vi.fn().mockResolvedValue(true),
}))
vi.mock('../../storage/persistence', () => ({ requestPersistentStorage }))

beforeEach(async () => {
  requestPersistentStorage.mockClear()
  await clearAllData()
})

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
      'AED · VAT 5% · tax number shown as “TRN” · titled “Tax invoice” · total in words',
    )
    expect(screen.getByText(/must show their TRN/)).toBeInTheDocument()
    expect(useSettingsStore.getState()).toMatchObject({
      country: 'AE',
      currency: 'AED',
      locale: 'en-AE',
      taxLabel: 'VAT',
      defaultTaxRate: '5',
      taxIdLabel: 'TRN',
      documentTitle: 'Tax invoice',
      amountInWords: true,
    })
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
    fireEvent.change(screen.getByLabelText(/Payment instructions/), {
      target: { value: 'IBAN DE00 0000' },
    })
    next()

    expect(useProfileStore.getState()).toMatchObject({
      onboardingComplete: true,
      payment: { instructions: 'IBAN DE00 0000', methods: ['bank'] },
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
