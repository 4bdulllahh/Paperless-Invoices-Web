import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

const tones = {
  neutral: 'bg-surface-sunken text-fg-muted',
  accent: 'bg-accent-soft text-fg',
} as const

type BadgeProps = ComponentProps<'span'> & {
  tone?: keyof typeof tones
  /** Show a small coloured dot before the label. */
  dot?: boolean
}

export function Badge({ tone = 'neutral', dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />}
      {children}
    </span>
  )
}
