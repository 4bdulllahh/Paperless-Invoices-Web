import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAllData } from '../../storage/backup'
import { useLogoStore, useProfileStore } from '../../storage/stores'
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
