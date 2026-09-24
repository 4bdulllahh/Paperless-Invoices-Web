import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { THEME_STORAGE_KEY } from './hooks/useTheme'
import { clearAllData } from './storage/backup'
import { useDraftStore, useProfileStore } from './storage/stores'

// The shell is under test, not the PDF: pdf.js can't start its worker in jsdom, and on a busy
// run the live preview gets far enough to try.
vi.mock('./services/pdf', () => ({
  renderPreview: () => new Promise(() => {}),
  warmUp: () => {},
}))

beforeEach(() => clearAllData())

describe('first visit', () => {
  it('opens the setup wizard over an inert workspace', async () => {
    render(<App />)
    expect(await screen.findByRole('dialog', { name: 'Set up Paperless' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Preview' }).closest('[inert]')).not.toBeNull()
  })

  it('shows the workspace once setup is done', () => {
    useProfileStore.getState().completeOnboarding()
    render(<App />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Preview' }).closest('[inert]')).toBeNull()
  })
})

describe('App shell', () => {
  beforeEach(() => {
    useProfileStore.getState().completeOnboarding()
    useDraftStore.getState().startNewInvoice()
  })

  it('opens on the invoice editor with a preview', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Invoice details' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Preview' })).toBeInTheDocument()
  })

  it('switches panels from the navigation', async () => {
    render(<App />)
    const [desktopNav] = screen.getAllByRole('navigation', { name: 'Main' })
    fireEvent.click(desktopNav.querySelector('button[aria-label="History"]')!)

    expect(await screen.findByRole('heading', { name: 'History' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Invoice details' })).not.toBeInTheDocument()
    expect(await screen.findByText('No invoices yet')).toBeInTheDocument()
  })

  it('toggles and remembers the theme', () => {
    render(<App />)
    expect(document.documentElement.dataset.theme).toBe('light')

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument()
  })

  it('starts in the saved theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    render(<App />)
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
