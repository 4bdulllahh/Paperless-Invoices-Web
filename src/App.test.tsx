import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { THEME_STORAGE_KEY } from './hooks/useTheme'

describe('App shell', () => {
  it('opens on the invoice editor with a preview', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Invoice details' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Preview' })).toBeInTheDocument()
  })

  it('switches panels from the navigation', () => {
    render(<App />)
    const [desktopNav] = screen.getAllByRole('navigation', { name: 'Main' })
    fireEvent.click(desktopNav.querySelector('button[aria-label="History"]')!)

    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Invoice details' })).not.toBeInTheDocument()
    expect(screen.getByText('Coming in Milestone 8')).toBeInTheDocument()
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
