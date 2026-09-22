import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { clearAllData } from '../../storage/backup'
import { useSettingsStore } from '../../storage/stores'
import { InvoiceDefaultsForm } from './InvoiceDefaultsForm'

beforeEach(async () => {
  await clearAllData()
  useSettingsStore.getState().updateSettings({ locale: 'en-US', currency: 'USD' })
})

const type = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

describe('InvoiceDefaultsForm', () => {
  it('saves choices as they are made', () => {
    render(<InvoiceDefaultsForm />)
    type('Currency', 'GBP')
    type('Number & date format', 'en-GB')
    type('Tax name', 'VAT')
    type('Payment terms', '30')
    fireEvent.click(screen.getByRole('radio', { name: 'Tax included' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Classic' }))

    expect(useSettingsStore.getState()).toMatchObject({
      currency: 'GBP',
      locale: 'en-GB',
      taxLabel: 'VAT',
      paymentTermsDays: 30,
      taxMode: 'inclusive',
      templateId: 'classic',
    })
  })

  it('previews how amounts and dates will look', () => {
    render(<InvoiceDefaultsForm />)
    expect(screen.getByText(/Looks like: \$1,234\.56/)).toBeInTheDocument()
    type('Currency', 'EUR')
    type('Number & date format', 'de-DE')
    expect(screen.getByText(/Looks like: 1\.234,56/)).toBeInTheDocument()
  })

  it('explains and refuses an invoice number format without a number', () => {
    render(<InvoiceDefaultsForm />)
    type('Invoice number format', 'INV-{YYYY}')
    expect(screen.getByText(/Include \{####\}/)).toBeInTheDocument()
    expect(useSettingsStore.getState().numberPattern).toBe('INV-{YYYY}-{####}')

    type('Invoice number format', '')
    expect(screen.getByText(/Enter a format/)).toBeInTheDocument()

    type('Invoice number format', '{YY}/{###}')
    expect(useSettingsStore.getState().numberPattern).toBe('{YY}/{###}')
    expect(screen.getByText(/^Next: \d{2}\/001\./)).toBeInTheDocument()
  })

  it('only saves a whole next number of 1 or more', () => {
    render(<InvoiceDefaultsForm />)
    type('Next number', '0')
    expect(screen.getByText('Enter a whole number, 1 or more.')).toBeInTheDocument()
    type('Next number', '2.5')
    expect(useSettingsStore.getState().nextSequence).toBe(1)
    type('Next number', '120')
    expect(useSettingsStore.getState().nextSequence).toBe(120)
  })

  it('only saves valid tax rates', () => {
    render(<InvoiceDefaultsForm />)
    type(/Default tax rate/, '120')
    expect(screen.getByText('A tax rate can’t be over 100%.')).toBeInTheDocument()
    type(/Default tax rate/, 'twenty')
    expect(screen.getByText('Enter a percentage, e.g. 20 or 8.875.')).toBeInTheDocument()
    expect(useSettingsStore.getState().defaultTaxRate).toBe('')
    type(/Default tax rate/, '8.875')
    expect(useSettingsStore.getState().defaultTaxRate).toBe('8.875')
  })

  it('shows changes made elsewhere, such as a restored backup', () => {
    render(<InvoiceDefaultsForm />)
    type('Invoice number format', 'broken')
    fireEvent.change(screen.getByLabelText('Next number'), { target: { value: '5' } })
    act(() => useSettingsStore.getState().updateSettings({ numberPattern: 'Q-{####}' }))
    expect(screen.getByLabelText('Invoice number format')).toHaveValue('Q-{####}')
  })
})
