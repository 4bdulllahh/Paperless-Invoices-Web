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

describe('OnboardingWizard', () => {
  it('asks for a business name before moving on', () => {
    render(<OnboardingWizard />)
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
    expect(screen.queryByText('Enter your business or trading name.')).not.toBeInTheDocument()

    next()

    expect(screen.getByText('Enter your business or trading name.')).toBeInTheDocument()
    expect(stepHeading()).toHaveTextContent('Your business')
  })

  it('walks through all three steps and fills in the first invoice', () => {
    render(<OnboardingWizard />)
    expect(stepHeading()).toHaveFocus()

    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Acme Studio' } })
    next()
    expect(stepHeading()).toHaveTextContent('Invoice defaults')
    expect(stepHeading()).toHaveFocus()

    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'EUR' } })
    next()
    expect(stepHeading()).toHaveTextContent('Getting paid')

    fireEvent.change(screen.getByLabelText(/Payment instructions/), {
      target: { value: 'IBAN DE00 0000' },
    })
    next()

    expect(useProfileStore.getState()).toMatchObject({
      onboardingComplete: true,
      payment: { instructions: 'IBAN DE00 0000' },
    })
    expect(useSettingsStore.getState().currency).toBe('EUR')
    expect(useDraftStore.getState().invoice).toMatchObject({
      currency: 'EUR',
      from: { name: 'Acme Studio' },
    })
    expect(requestPersistentStorage).toHaveBeenCalledOnce()
  })

  it('can go back a step', () => {
    useProfileStore.getState().updateBusiness({ name: 'Acme Studio' })
    render(<OnboardingWizard />)
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
