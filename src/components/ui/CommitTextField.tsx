import { useState, type ComponentProps } from 'react'
import { TextField } from './Field'

type CommitTextFieldProps = Omit<
  ComponentProps<typeof TextField>,
  'value' | 'onChange' | 'error' | 'defaultValue'
> & {
  /** The saved value. */
  value: string
  /** Called with the text whenever it is valid. */
  onCommit: (text: string) => void
  /** Returns an error message, or undefined when the text can be saved. */
  validate: (text: string) => string | undefined
}

/**
 * A text field for settings that must never be saved in a broken state (e.g. an invoice number
 * pattern). The user can type freely; only valid text is saved, and problems are explained.
 */
export function CommitTextField({ value, onCommit, validate, ...props }: CommitTextFieldProps) {
  const [text, setText] = useState(value)
  const [savedValue, setSavedValue] = useState(value)
  // Follow outside changes (a restored backup, another tab) without an effect.
  if (value !== savedValue) {
    setSavedValue(value)
    setText(value)
  }

  return (
    <TextField
      {...props}
      value={text}
      error={validate(text)}
      onChange={(event) => {
        const next = event.target.value
        setText(next)
        if (!validate(next)) onCommit(next)
      }}
    />
  )
}
