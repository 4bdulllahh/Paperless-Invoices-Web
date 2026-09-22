import { beforeEach, describe, expect, it } from 'vitest'
import { clearAllData } from './backup'
import { finishOnboarding, loadSampleData } from './onboarding'
import { useDraftStore, useProfileStore, useSettingsStore } from './stores'

beforeEach(() => clearAllData())

describe('finishOnboarding', () => {
  it('completes setup and starts an invoice with the new defaults', () => {
    useProfileStore.getState().updateBusiness({ name: 'Acme Studio' })
    useSettingsStore.getState().updateSettings({ currency: 'EUR', nextSequence: 7 })

    finishOnboarding('2026-09-23')

    expect(useProfileStore.getState().onboardingComplete).toBe(true)
    expect(useDraftStore.getState().invoice).toMatchObject({
      number: 'INV-2026-0007',
      currency: 'EUR',
      from: { name: 'Acme Studio' },
    })
  })

  it('rebuilds an untouched draft so it picks up changed defaults', () => {
    useDraftStore.getState().startNewInvoice('2026-09-23')
    useSettingsStore.getState().updateSettings({ currency: 'GBP' })
    finishOnboarding('2026-09-23')
    expect(useDraftStore.getState().invoice?.currency).toBe('GBP')
  })

  it('keeps a draft the user has started', () => {
    const { startNewInvoice, updateInvoice } = useDraftStore.getState()
    startNewInvoice('2026-09-23')
    updateInvoice((invoice) => ({ ...invoice, notes: 'Keep me' }))
    useSettingsStore.getState().updateSettings({ currency: 'GBP' })

    finishOnboarding('2026-09-23')

    expect(useDraftStore.getState().invoice).toMatchObject({ notes: 'Keep me', currency: 'USD' })
  })
})

describe('loadSampleData', () => {
  it('fills in a fictional business, defaults and invoice', () => {
    loadSampleData('2026-09-23')

    expect(useProfileStore.getState()).toMatchObject({
      business: { name: 'Acme Studio' },
      payment: { link: 'https://pay.example.com/acme-studio' },
      onboardingComplete: true,
    })
    expect(useSettingsStore.getState()).toMatchObject({ taxLabel: 'Sales tax', nextSequence: 42 })
    expect(useDraftStore.getState().invoice).toMatchObject({
      number: 'INV-2026-0042',
      issueDate: '2026-09-23',
      dueDate: '2026-10-07',
      to: { name: 'Northwind Ltd' },
    })
  })
})
