import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type CollapsibleProps = {
  title: string
  /** Short summary shown next to the title, e.g. a count or total. */
  meta?: ReactNode
  icon?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  className?: string
  id?: string
}

/**
 * An editor section that can fold away once it's done, so the editor pane stays short.
 * Built on <details>, so it works with the keyboard and screen readers without extra code.
 */
export function Collapsible({
  title,
  meta,
  icon,
  defaultOpen,
  children,
  className,
  id,
}: CollapsibleProps) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className={cn('group rounded-lg border border-line bg-surface', className)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-4 py-3.5 select-none hover:bg-surface-muted [&::-webkit-details-marker]:hidden">
        {icon && (
          <span className="grid size-8 place-items-center rounded-md bg-surface-sunken text-fg-muted [&_svg]:size-4">
            {icon}
          </span>
        )}
        <span className="font-display text-[15px] font-semibold">{title}</span>
        {meta && <span className="ml-auto text-sm text-fg-subtle">{meta}</span>}
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-fg-subtle transition-transform duration-200 group-open:rotate-180',
            !meta && 'ml-auto',
          )}
          aria-hidden="true"
        />
      </summary>
      <div className="px-4 pt-1 pb-4">{children}</div>
    </details>
  )
}
