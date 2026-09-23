import { Check, UserPlus } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { partyOf, saveClientState } from '../../../domain/clients'
import { taxIdIssue, taxIdRules } from '../../../domain/compliance'
import type { Invoice, Party } from '../../../domain/schema'
import { useHydrated } from '../../../hooks/useHydrated'
import { useClientsStore } from '../../../storage/stores'
import { ClientCombobox } from '../ClientCombobox'
import { PartyFields } from './PartyFields'
import type { InvoiceUpdater } from './types'

/** Who the invoice is for, with saved-client suggestions and a one-click save. */
export function BillToSection({ invoice, update }: { invoice: Invoice; update: InvoiceUpdater }) {
  const hydrated = useHydrated(useClientsStore)
  const clients = useClientsStore((state) => state.clients)
  const saveClient = useClientsStore((state) => state.saveClient)
  const change = (patch: Partial<Party>) =>
    update((inv) => ({ ...inv, to: { ...inv.to, ...patch } }))
  const state = saveClientState(clients, invoice.to)

  return (
    <div className="flex flex-col gap-3">
      <PartyFields
        party={invoice.to}
        onChange={change}
        namePlaceholder="Northwind Ltd"
        taxId={{
          label: invoice.taxIdLabel || 'Tax ID',
          example: taxIdRules(invoice.country).example,
          issue: taxIdIssue(invoice.country, invoice.to.taxId, invoice.taxIdLabel),
        }}
        nameField={
          <ClientCombobox
            value={invoice.to.name}
            onChange={(name) => change({ name })}
            clients={hydrated ? clients : []}
            onSelect={(client) => update((inv) => ({ ...inv, to: partyOf(client) }))}
          />
        }
      />
      {hydrated && state.kind !== 'empty' && (
        <div className="flex items-center gap-2">
          {state.kind === 'saved' ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-fg-subtle">
              <Check className="size-4 text-accent" aria-hidden="true" />
              Saved in your clients
            </span>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="-ml-2"
              onClick={() =>
                saveClient(invoice.to, state.kind === 'changed' ? state.client.id : undefined)
              }
            >
              <UserPlus />
              {state.kind === 'changed' ? 'Update saved client' : 'Save to clients'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
