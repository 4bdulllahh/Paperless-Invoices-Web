import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAllData } from '../../storage/backup'
import { useLogoStore, useProfileStore, useSettingsStore } from '../../storage/stores'
import { BusinessPanel } from './BusinessPanel'

const { prepareLogo } = vi.hoisted(() => ({ prepareLogo: vi.fn() }))
vi.mock('../../services/logo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/logo')>()),
  prepareLogo,
}))

beforeEach(async () => {
  prepareLogo.mockReset()
  await clearAllData()
})

const logo = { dataUrl: 'data:image/png;base64,AAAA', width: 400, height: 200 }

async function uploadLogo() {
  const file = new File(['x'], 'logo.png', { type: 'image/png' })
  await act(async () => {
    fireEvent.change(screen.getByTestId('logo-file-input'), { target: { files: [file] } })
  })
}

describe('BusinessPanel', () => {
  it('saves business details as they are typed', () => {
    render(<BusinessPanel />)
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Acme Studio' } })
    fireEvent.change(screen.getByLabelText(/Address/), { target: { value: '1 Main St\nTown' } })
    expect(useProfileStore.getState().business).toMatchObject({
      name: 'Acme Studio',
      address: '1 Main St\nTown',
    })
  })

  it('flags a missing name and a malformed email', () => {
    render(<BusinessPanel />)
    expect(screen.getByText('Enter your business or trading name.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'hello@' } })
    expect(screen.getByLabelText(/Email/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(/Enter a valid email/)).toBeInTheDocument()
  })

  it('only saves a valid payment link', () => {
    render(<BusinessPanel />)
    const link = screen.getByLabelText(/Payment link/)
    fireEvent.change(link, { target: { value: 'pay.example.com' } })
    expect(screen.getByText('Enter a full link starting with https://')).toBeInTheDocument()
    expect(useProfileStore.getState().payment.link).toBe('')

    fireEvent.change(link, { target: { value: 'https://pay.example.com/acme ' } })
    expect(useProfileStore.getState().payment.link).toBe('https://pay.example.com/acme')
  })

  it('sets up a UPI QR code, saving only a valid UPI ID', () => {
    render(<BusinessPanel />)
    expect(screen.getByLabelText('QR code on invoices')).toHaveValue('link')
    expect(screen.queryByLabelText('UPI ID')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('QR code on invoices'), { target: { value: 'upi' } })
    expect(screen.getByText(/Your default currency is USD/)).toBeInTheDocument()
    const upiId = screen.getByLabelText('UPI ID')
    fireEvent.change(upiId, { target: { value: 'acmestudio' } })
    expect(screen.getByText(/Enter a UPI ID like/)).toBeInTheDocument()
    expect(useProfileStore.getState().payment.upiId).toBe('')

    fireEvent.change(upiId, { target: { value: 'acmestudio@okhdfcbank ' } })
    expect(useProfileStore.getState().payment).toMatchObject({
      qr: 'upi',
      upiId: 'acmestudio@okhdfcbank',
    })
  })

  it('sets up a SEPA QR code, tidying the IBAN and BIC', () => {
    useSettingsStore.getState().updateSettings({ currency: 'EUR' })
    render(<BusinessPanel />)
    fireEvent.change(screen.getByLabelText('QR code on invoices'), { target: { value: 'sepa' } })
    expect(screen.getByText(/Also called a GiroCode/).textContent).not.toMatch(/default currency/)

    const iban = screen.getByLabelText('IBAN')
    fireEvent.change(iban, { target: { value: 'de89370400440532013001' } })
    expect(screen.getByText(/Check the IBAN/)).toBeInTheDocument()
    expect(useProfileStore.getState().payment.iban).toBe('')

    fireEvent.change(iban, { target: { value: 'de89370400440532013000' } })
    expect(iban).toHaveValue('DE89 3704 0044 0532 0130 00')

    const bic = screen.getByLabelText(/BIC/)
    fireEvent.change(bic, { target: { value: 'cobade' } })
    expect(screen.getByText(/8 or 11/)).toBeInTheDocument()
    fireEvent.change(bic, { target: { value: 'cobadeff' } })
    expect(useProfileStore.getState().payment).toMatchObject({
      qr: 'sepa',
      iban: 'DE89 3704 0044 0532 0130 00',
      bic: 'COBADEFF',
    })

    fireEvent.change(iban, { target: { value: '' } })
    expect(useProfileStore.getState().payment.iban).toBe('')
  })

  it('explains each QR choice', () => {
    render(<BusinessPanel />)
    const select = screen.getByLabelText('QR code on invoices')
    expect(screen.getByText(/Add a payment link above/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Payment link/), {
      target: { value: 'https://pay.example.com/acme' },
    })
    expect(screen.getByText(/Clients scan it to open your payment link/)).toBeInTheDocument()
    fireEvent.change(select, { target: { value: 'none' } })
    expect(screen.getByText('Invoices won’t have a QR code.')).toBeInTheDocument()
    expect(useProfileStore.getState().payment.qr).toBe('none')
  })

  it('uploads, replaces and removes a logo', async () => {
    prepareLogo.mockResolvedValue(logo)
    render(<BusinessPanel />)

    await uploadLogo()
    expect(useLogoStore.getState().logo).toEqual(logo)
    expect(screen.getByRole('img', { name: 'Your logo' })).toHaveAttribute('src', logo.dataUrl)

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(useLogoStore.getState().logo).toBeNull()
    expect(screen.getByText('No logo')).toBeInTheDocument()
  })

  it('explains why a logo was rejected', async () => {
    const { LogoError } = await import('../../services/logo')
    prepareLogo.mockRejectedValueOnce(new LogoError('Use a PNG, JPG, WebP or SVG image.'))
    render(<BusinessPanel />)

    await uploadLogo()
    expect(screen.getByText('Use a PNG, JPG, WebP or SVG image.')).toBeInTheDocument()

    prepareLogo.mockRejectedValueOnce(new Error('unexpected'))
    await uploadLogo()
    expect(screen.getByText('That image couldn’t be used.')).toBeInTheDocument()
    expect(useLogoStore.getState().logo).toBeNull()
  })
})
