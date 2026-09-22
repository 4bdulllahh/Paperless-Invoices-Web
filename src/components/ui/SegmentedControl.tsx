import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type SegmentedOption<T extends string> = {
  value: T
  label: ReactNode
  /** Needed when `label` is an icon only. */
  ariaLabel?: string
}

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible name for the group. */
  label: string
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Pill-shaped single-choice switcher (template picker, Edit/Preview toggle).
 * Behaves as a radio group: one Tab stop, arrow keys move and select.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  function handleKeyDown(event: KeyboardEvent, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    let next: number | undefined
    if (step) next = (index + step + options.length) % options.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = options.length - 1
    if (next === undefined) return
    event.preventDefault()
    onChange(options[next].value)
    buttons.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex rounded-full bg-surface-sunken p-1', className)}
    >
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttons.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition duration-150',
              size === 'sm' ? 'h-7 px-3 text-xs' : 'h-8 px-4 text-sm',
              selected ? 'bg-surface text-fg shadow-elev-1' : 'text-fg-subtle hover:text-fg',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
