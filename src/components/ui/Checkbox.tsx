import { Check } from 'lucide-react'
import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

type CheckboxFieldProps = Omit<ComponentProps<'input'>, 'type' | 'className' | 'id'> & {
  label: ReactNode
  hint?: string
  className?: string
}

/** A labelled checkbox with an optional explanation underneath. */
export function CheckboxField({ label, hint, className, ...props }: CheckboxFieldProps) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-0.5 size-[18px] shrink-0 cursor-pointer rounded accent-accent"
        {...props}
      />
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-fg">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="text-xs text-fg-subtle">
            {hint}
          </p>
        )}
      </div>
    </div>
  )
}

type ChoiceChipsProps<T extends string> = {
  /** Visible name of the group. */
  legend: string
  hint?: string
  options: readonly { value: T; label: string }[]
  selected: readonly T[]
  onChange: (selected: T[]) => void
}

/** Pick any number of options, shown as pill toggles. Real checkboxes underneath. */
export function ChoiceChips<T extends string>({
  legend,
  hint,
  options,
  selected,
  onChange,
}: ChoiceChipsProps<T>) {
  const hintId = useId()
  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={hint ? hintId : undefined}>
      <legend className="mb-1.5 text-sm font-medium text-fg-muted">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = selected.includes(option.value)
          return (
            <label
              key={option.value}
              className={cn(
                'flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition select-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
                on
                  ? 'border-accent bg-accent-soft text-fg'
                  : 'border-line-strong bg-surface text-fg-muted hover:bg-surface-muted',
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={() =>
                  onChange(
                    // Keep the options' order, whatever order they were ticked in.
                    options
                      .map((o) => o.value)
                      .filter((value) => (value === option.value ? !on : selected.includes(value))),
                  )
                }
              />
              {on && <Check className="size-3.5 text-accent" aria-hidden="true" />}
              {option.label}
            </label>
          )
        })}
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-fg-subtle">
          {hint}
        </p>
      )}
    </fieldset>
  )
}
