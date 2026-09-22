import { useId, type ComponentProps } from 'react'
import { cn } from '../../lib/cn'

const controlClass =
  'w-full rounded-md border border-line-strong bg-surface-muted px-3.5 text-[15px] text-fg transition duration-150 placeholder:text-fg-subtle hover:border-fg-subtle focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15 focus:outline-none'

type FieldShellProps = {
  label: string
  hint?: string
  className?: string
}

type TextFieldProps = FieldShellProps & Omit<ComponentProps<'input'>, 'className'>

/** Labelled text input. The label is always visible; placeholders are for examples only. */
export function TextField({ label, hint, className, id, ...props }: TextFieldProps) {
  const fallbackId = useId()
  const inputId = id ?? fallbackId
  const hintId = hint ? `${inputId}-hint` : undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-fg-muted">
        {label}
      </label>
      <input
        id={inputId}
        aria-describedby={hintId}
        className={cn(controlClass, 'h-11')}
        {...props}
      />
      {hint && (
        <p id={hintId} className="text-xs text-fg-subtle">
          {hint}
        </p>
      )}
    </div>
  )
}

type TextAreaFieldProps = FieldShellProps & Omit<ComponentProps<'textarea'>, 'className'>

export function TextAreaField({
  label,
  hint,
  className,
  id,
  rows = 3,
  ...props
}: TextAreaFieldProps) {
  const fallbackId = useId()
  const inputId = id ?? fallbackId
  const hintId = hint ? `${inputId}-hint` : undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-fg-muted">
        {label}
      </label>
      <textarea
        id={inputId}
        rows={rows}
        aria-describedby={hintId}
        className={cn(controlClass, 'resize-none py-2.5 leading-relaxed')}
        {...props}
      />
      {hint && (
        <p id={hintId} className="text-xs text-fg-subtle">
          {hint}
        </p>
      )}
    </div>
  )
}
