import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ColorPicker } from './ColorPicker'

function Picker({ onChange }: { onChange: (color: string) => void }) {
  const [value, setValue] = useState('#eb5e28')
  return (
    <ColorPicker
      label="PDF colour"
      value={value}
      onChange={(color) => {
        setValue(color)
        onChange(color)
      }}
    />
  )
}

function open() {
  const onChange = vi.fn()
  render(<Picker onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: 'PDF colour: Flame' }))
  return onChange
}

describe('ColorPicker', () => {
  it('opens a panel of ready-made colours and picks one', () => {
    const onChange = open()
    expect(screen.getByRole('dialog', { name: 'PDF colour' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Flame' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Navy' }))
    expect(onChange).toHaveBeenLastCalledWith('#1f3a68')
    expect(screen.getByRole('button', { name: 'Navy' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'PDF colour: Navy' })).toBeInTheDocument()
    // White reads better on navy, and the sample shows it.
    expect(screen.getByText('Balance due')).toHaveStyle({ color: '#ffffff' })
  })

  it('takes a hex colour, short or long', () => {
    const onChange = open()
    const hex = screen.getByLabelText('Hex colour')
    fireEvent.change(hex, { target: { value: '#11867F' } })
    expect(onChange).toHaveBeenLastCalledWith('#11867f')

    fireEvent.change(hex, { target: { value: 'abc' } })
    fireEvent.blur(hex)
    expect(onChange).toHaveBeenLastCalledWith('#aabbcc')

    fireEvent.change(hex, { target: { value: 'zz' } })
    fireEvent.blur(hex)
    expect(hex).toHaveValue('AABBCC')
  })

  it('moves hue, saturation and brightness from the keyboard', () => {
    const onChange = open()
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Hue' }), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledTimes(1)
    const square = screen.getByRole('slider', { name: 'Saturation and brightness' })
    fireEvent.keyDown(square, { key: 'ArrowDown', shiftKey: true })
    expect(square).toHaveAttribute('aria-valuetext', expect.stringContaining('brightness 82%'))
    fireEvent.keyDown(square, { key: 'Tab' })
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('closes with Escape, a click elsewhere or the close button', () => {
    open()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /PDF colour/ })).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: /PDF colour/ }))
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /PDF colour/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
