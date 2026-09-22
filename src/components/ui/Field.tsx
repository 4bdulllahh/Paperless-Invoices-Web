import { ChevronDown, CircleAlert } from 'lucide-react'
import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

const controlClass =
  'w-full rounded-md border border-line-strong bg-surface-muted px-3.5 text-[15px] text-fg transition duration-150 placeholder:text-fg-subtle hover:border-fg-subtle focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15 focus:outline-none aria-invalid:border-accent'

type FieldShellProps = {
  label: string
  hint?: string
  /** Shown instead of the hint, and marks the control invalid. */
  error?: string
  /** Adds "(optional)" after the label. */
  optional?: boolean
  className?: string
}

/** Label, control and hint/error, wired together for screen readers. */
function FieldShell({
  label,
  hint,
  error,
  optional,
  className,
  children,
}: FieldShellProps & {
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode
}) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg-muted">
        {label}
        {optional && <span className="font-normal text-fg-subtle"> (optional)</span>}
      </label>
      {children({ id, describedBy: message ? messageId : undefined, invalid: Boolean(error) })}
      {message && (
        <p
          id={messageId}
          className={cn(
            'flex items-start gap-1.5 text-xs',
            error ? 'font-medium text-fg' : 'text-fg-subtle',
          )}
        >
          {error && (
            <CircleAlert className="mt-px size-3.5 shrink-0 text-accent" aria-hidden="true" />
          )}
          {message}
        </p>
      )}
    </div>
  )
}

type TextFieldProps = FieldShellProps & Omit<ComponentProps<'input'>, 'className' | 'id'>

/** Labelled text input. The label is always visible; placeholders are for examples only. */
export function TextField({ label, hint, error, optional, className, ...props }: TextFieldProps) {
  return (
    <FieldShell {...{ label, hint, error, optional, className }}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(controlClass, 'h-11')}
          {...props}
        />
      )}
    </FieldShell>
  )
}

type TextAreaFieldProps = FieldShellProps & Omit<ComponentProps<'textarea'>, 'className' | 'id'>

export function TextAreaField({
  label,
  hint,
  error,
  optional,
  className,
  rows = 3,
  ...props
}: TextAreaFieldProps) {
  return (
    <FieldShell {...{ label, hint, error, optional, className }}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(controlClass, 'resize-none py-2.5 leading-relaxed')}
          {...props}
        />
      )}
    </FieldShell>
  )
}

type SelectFieldProps = FieldShellProps & Omit<ComponentProps<'select'>, 'className' | 'id'>

/** Native select: accessible and familiar on every device, styled to match. */
export function SelectField({
  label,
  hint,
  error,
  optional,
  className,
  children,
  ...props
}: SelectFieldProps) {
  return (
    <FieldShell {...{ label, hint, error, optional, className }}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <select
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(controlClass, 'h-11 cursor-pointer appearance-none pr-10')}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden="true"
          />
        </div>
      )}
    </FieldShell>
  )
}
