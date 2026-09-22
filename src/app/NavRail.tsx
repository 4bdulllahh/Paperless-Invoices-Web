import { cn } from '../lib/cn'
import { NAV_ITEMS, type PanelId } from './navigation'

type NavRailProps = {
  active: PanelId
  onSelect: (id: PanelId) => void
  /** Vertical icon rail on desktop, bottom tab bar on smaller screens. */
  orientation: 'vertical' | 'horizontal'
  className?: string
}

export function NavRail({ active, onSelect, orientation, className }: NavRailProps) {
  const vertical = orientation === 'vertical'
  return (
    <nav
      aria-label="Main"
      className={cn(
        'shrink-0 rounded-xl border border-line bg-surface shadow-elev-1',
        vertical ? 'w-[76px] flex-col items-center gap-1.5 py-3' : 'h-16 items-stretch px-1.5',
        className,
      )}
    >
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const selected = id === active
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={selected ? 'page' : undefined}
            aria-label={vertical ? label : undefined}
            className={cn(
              'group relative flex cursor-pointer items-center justify-center transition duration-150',
              vertical
                ? 'size-12 rounded-lg'
                : 'my-1.5 flex-1 flex-col gap-0.5 rounded-lg text-[11px] font-medium',
              selected
                ? 'bg-accent-soft text-fg'
                : 'text-fg-subtle hover:bg-surface-muted hover:text-fg',
            )}
          >
            <Icon className={cn('size-5', selected && 'text-accent')} aria-hidden="true" />
            {vertical ? (
              <span
                role="tooltip"
                className="pointer-events-none absolute left-full z-10 ml-3 rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-cream opacity-0 shadow-elev-2 transition group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                {label}
              </span>
            ) : (
              label
            )}
          </button>
        )
      })}
    </nav>
  )
}
