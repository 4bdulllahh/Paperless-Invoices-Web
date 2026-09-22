import { Building2, ListOrdered, Percent, Plus, QrCode, StickyNote, UserRound } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Collapsible } from '../../components/ui/Collapsible'
import { TextAreaField, TextField } from '../../components/ui/Field'
import { cn } from '../../lib/cn'

/**
 * Editor layout. Fields are not wired to state yet: storage arrives in Milestone 3
 * and the working editor in Milestone 5.
 */
export function EditorPane({ className }: { className?: string }) {
  return (
    <Card className={cn('flex min-h-0 flex-col overflow-hidden', className)}>
      <div className="border-b border-line px-5 py-4">
        <h1 className="font-display text-lg font-semibold tracking-tight">Invoice details</h1>
        <p className="text-sm text-fg-subtle">Fields start working in Milestone 5.</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3 sm:p-4">
        <Collapsible title="Your business" icon={<Building2 />} defaultOpen>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Business name" placeholder="Acme Studio" />
            <TextField label="Email" type="email" placeholder="hello@acme.studio" />
          </div>
        </Collapsible>

        <Collapsible title="Bill to" icon={<UserRound />} defaultOpen>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Client name" placeholder="Northwind Ltd" />
            <TextField label="Client email" type="email" placeholder="accounts@northwind.com" />
          </div>
        </Collapsible>

        <Collapsible title="Line items" icon={<ListOrdered />} meta="1 item" defaultOpen>
          <div className="grid grid-cols-[1fr_4.5rem_6.5rem] gap-2">
            <TextField label="Description" placeholder="Website design" />
            <TextField label="Qty" inputMode="decimal" placeholder="1" />
            <TextField label="Price" inputMode="decimal" placeholder="0.00" />
          </div>
          <Button variant="ghost" size="sm" className="mt-3 -ml-2">
            <Plus />
            Add item
          </Button>
        </Collapsible>

        <Collapsible title="Tax & discounts" icon={<Percent />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Tax rate (%)" inputMode="decimal" placeholder="20" />
            <TextField label="Discount (%)" inputMode="decimal" placeholder="0" />
          </div>
        </Collapsible>

        <Collapsible title="Payment" icon={<QrCode />}>
          <TextField
            label="Payment link"
            type="url"
            placeholder="https://paypal.me/acme"
            hint="Printed on the invoice as a QR code."
          />
        </Collapsible>

        <Collapsible title="Notes" icon={<StickyNote />}>
          <TextAreaField label="Notes to client" placeholder="Thank you for your business!" />
        </Collapsible>
      </div>

      <div className="flex items-center justify-between border-t border-line bg-surface-muted px-5 py-3.5">
        <span className="text-sm font-medium text-fg-muted">Balance due</span>
        <span className="font-display text-xl font-semibold tabular-nums">$0.00</span>
      </div>
    </Card>
  )
}
