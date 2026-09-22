import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

/** Rounded surface used for every pane and panel. */
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-xl border border-line bg-surface shadow-elev-1', className)}
      {...props}
    />
  )
}
