import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { cn } from '../../lib/cn'
import { DataSection } from './DataSection'

export function SettingsPanel({ className }: { className?: string }) {
  return (
    <Card className={cn('flex min-h-0 flex-col overflow-hidden', className)}>
      <div className="border-b border-line px-5 py-4">
        <h1 className="font-display text-lg font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-fg-subtle">Defaults for new invoices, and your saved data.</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-5">
        <section className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-line-strong p-4">
          <div>
            <h2 className="font-display font-semibold">Invoice defaults</h2>
            <p className="text-sm text-fg-muted">
              Currency, tax, payment terms, numbering and template.
            </p>
          </div>
          <Badge tone="accent">Milestone 4</Badge>
        </section>
        <DataSection />
      </div>
    </Card>
  )
}
