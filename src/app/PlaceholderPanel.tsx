import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { cn } from '../lib/cn'
import type { NavItem } from './navigation'

type PlaceholderPanelProps = {
  item: NavItem
  className?: string
}

/** Stands in for panels that later milestones build. */
export function PlaceholderPanel({
  item: { label, icon: Icon, description, milestone },
  className,
}: PlaceholderPanelProps) {
  return (
    <Card
      className={cn('flex flex-col items-center justify-center gap-4 p-8 text-center', className)}
    >
      <span className="grid size-16 place-items-center rounded-lg bg-accent-soft text-accent">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <h1 className="font-display text-2xl font-semibold tracking-tight">{label}</h1>
      <p className="max-w-sm text-fg-muted">{description}</p>
      <Badge tone="accent">Coming in Milestone {milestone}</Badge>
    </Card>
  )
}
