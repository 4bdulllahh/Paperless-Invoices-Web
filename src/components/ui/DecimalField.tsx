import { useState, type ComponentProps } from 'react'
import { displayDecimal, normalizeDecimalInput } from '../../domain/decimalInput'
import { TextField } from './Field'

type DecimalFieldProps = Omit<
  ComponentProps<typeof TextField>,
  'value' | 'onChange' | 'error' | 'defaultValue' | 'type'
> & {
  /** Saved value, always with "." as the decimal point. */
  value: string
  /** Decides which separator is shown, and how "1,500" is read. */
  locale: string
  /** Returns an error message for a normalised value, or undefined if it can be saved. */
  validate: (value: string) => string | undefined
  onCommit: (value: string) => void
}

/**
 * A number input that accepts "12,50" or "12.50" and only ever saves valid values.
 * On blur it shows how the input was read, e.g. "1,500" becomes "1500" in en-US.
 */
export function DecimalField({
  value,
  locale,
  validate,
  onCommit,
  onBlur,
  ...props
}: DecimalFieldProps) {
  const [text, setText] = useState(() => displayDecimal(value, locale))
  const [synced, setSynced] = useState({ value, locale })

  // Follow outside changes (duplicate, restore, another tab) without an effect, but leave the
  // user's own typing alone when it already means the saved value ("12," is "12.").
  if (value !== synced.value || locale !== synced.locale) {
    setSynced({ value, locale })
    if (normalizeDecimalInput(text, locale) !== value) setText(displayDecimal(value, locale))
  }

  const normalized = normalizeDecimalInput(text, locale)
  const error = validate(normalized)

  return (
    <TextField
      {...props}
      inputMode="decimal"
      autoComplete="off"
      value={text}
      error={error}
      onChange={(event) => {
        const next = event.target.value
        setText(next)
        const candidate = normalizeDecimalInput(next, locale)
        if (!validate(candidate)) onCommit(candidate)
      }}
      onBlur={(event) => {
        if (!error) {
          const tidy = normalized.endsWith('.') ? normalized.slice(0, -1) : normalized
          if (tidy !== value) onCommit(tidy)
          setText(displayDecimal(tidy, locale))
        }
        onBlur?.(event)
      }}
    />
  )
}
