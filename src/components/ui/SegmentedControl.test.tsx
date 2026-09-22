import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { SegmentedControl } from './SegmentedControl'

const OPTIONS = [
  { value: 'modern', label: 'Modern' },
  { value: 'classic', label: 'Classic' },
  { value: 'minimal', label: 'Minimal' },
] as const

function Harness() {
  const [value, setValue] = useState<(typeof OPTIONS)[number]['value']>('modern')
  return <SegmentedControl label="Template" options={OPTIONS} value={value} onChange={setValue} />
}

describe('SegmentedControl', () => {
  it('is a radio group with one checked option and one tab stop', () => {
    render(<Harness />)
    expect(screen.getByRole('radiogroup', { name: 'Template' })).toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false'])
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1])
  })

  it('selects on click', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('radio', { name: 'Minimal' }))
    expect(screen.getByRole('radio', { name: 'Minimal' })).toBeChecked()
  })

  it('moves selection and focus with arrow keys, wrapping at the ends', () => {
    render(<Harness />)
    const modern = screen.getByRole('radio', { name: 'Modern' })

    fireEvent.keyDown(modern, { key: 'ArrowLeft' })
    expect(screen.getByRole('radio', { name: 'Minimal' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Minimal' })).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('radio', { name: 'Minimal' }), { key: 'ArrowRight' })
    expect(modern).toBeChecked()
    expect(modern).toHaveFocus()

    fireEvent.keyDown(modern, { key: 'End' })
    expect(screen.getByRole('radio', { name: 'Minimal' })).toBeChecked()
  })
})
