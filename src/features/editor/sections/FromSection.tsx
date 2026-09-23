import { Pencil } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { CheckboxField } from '../../../components/ui/Checkbox'
import { taxIdIssue, taxIdRules } from '../../../domain/compliance'
import type { Invoice, Party } from '../../../domain/schema'
import { SignatureFields } from '../../business/SignatureFields'
import { PartyFields } from './PartyFields'
import type { InvoiceUpdater } from './types'

type FromSectionProps = {
  invoice: Invoice
  update: InvoiceUpdater
  onEditProfile: () => void
}

/**
 * The sender, filled in from the business profile. Edits here apply to this invoice only,
 * except the signature and stamp, which are kept with the profile.
 */
export function FromSection({ invoice, update, onEditProfile }: FromSectionProps) {
  const change = (patch: Partial<Party>) =>
    update((inv) => ({ ...inv, from: { ...inv.from, ...patch } }))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-muted px-3 py-2 text-sm text-fg-muted">
        <span>Filled in from your profile. Edits here only change this invoice.</span>
        <Button size="sm" variant="ghost" className="-my-1 h-8 px-3" onClick={onEditProfile}>
          <Pencil />
          Edit profile
        </Button>
      </div>
      <PartyFields
        party={invoice.from}
        onChange={change}
        namePlaceholder="Acme Studio"
        taxId={{
          label: invoice.taxIdLabel || 'Tax ID',
          required: taxIdRules(invoice.country).required,
          example: taxIdRules(invoice.country).example,
          issue: taxIdIssue(invoice.country, invoice.from.taxId, invoice.taxIdLabel),
        }}
      />
      <div className="flex flex-col gap-3 border-t border-line pt-3">
        <CheckboxField
          label="Sign this invoice"
          hint="Adds your signature and stamp over “Authorised signature”, or a line to sign on."
          checked={invoice.signed}
          onChange={(e) => update((inv) => ({ ...inv, signed: e.target.checked }))}
        />
        {invoice.signed && <SignatureFields />}
      </div>
    </div>
  )
}
