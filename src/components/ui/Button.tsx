import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

const variants = {
  primary: 'bg-accent text-accent-fg shadow-elev-1 hover:bg-accent-hover hover:-translate-y-px',
  secondary: 'border border-line-strong bg-surface text-fg hover:bg-surface-muted',
  ghost: 'text-fg-muted hover:bg-surface-muted hover:text-fg',
} as const

const sizes = {
  sm: 'h-9 gap-1.5 px-4 text-sm',
  md: 'h-11 gap-2 px-5 text-[15px]',
  icon: 'size-10',
  'icon-sm': 'size-8',
} as const

export type ButtonProps = ComponentProps<'button'> & {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

export function Button({
  variant = 'secondary',
  size = 'md',
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full font-semibold whitespace-nowrap transition duration-150 select-none',
        'disabled:pointer-events-none disabled:opacity-50',
        '[&_svg]:size-[18px] [&_svg]:shrink-0',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
