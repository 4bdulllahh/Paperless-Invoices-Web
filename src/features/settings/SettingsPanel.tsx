import { RotateCcw } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { cn } from '../../lib/cn'
import { useProfileStore } from '../../storage/stores'
import { DataSection } from './DataSection'
import { InvoiceDefaultsForm } from './InvoiceDefaultsForm'

export function SettingsPanel({ className }: { className?: string }) {
  const restartOnboarding = useProfileStore((state) => state.restartOnboarding)

  return (
    <Card className={cn('flex min-h-0 flex-col overflow-hidden', className)}>
      <div className="border-b border-line px-5 py-4">
        <h1 className="font-display text-lg font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-fg-subtle">
          Defaults for new invoices, and your saved data. Changes save automatically.
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto overscroll-contain p-5">
        <section aria-labelledby="defaults-heading" className="flex flex-col gap-4">
          <h2 id="defaults-heading" className="font-display text-lg font-semibold tracking-tight">
            Invoice defaults
          </h2>
          <InvoiceDefaultsForm />
        </section>
        <div className="border-t border-line pt-6">
          <DataSection />
        </div>
        <section className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          <div>
            <h2 className="font-display font-semibold">Setup guide</h2>
            <p className="text-sm text-fg-muted">Walk through the first-time setup again.</p>
          </div>
          <Button size="sm" onClick={restartOnboarding}>
            <RotateCcw />
            Run setup again
          </Button>
        </section>
        <p className="border-t border-line pt-6 text-sm text-fg-subtle">
          Paperless {__APP_VERSION__} · Free and open source ·{' '}
          <a
            href="https://github.com/4bdulllahh/Paperless-Invoices-Web"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-fg-muted underline underline-offset-2 hover:text-fg"
          >
            View the code on GitHub
          </a>
        </p>
      </div>
    </Card>
  )
}
