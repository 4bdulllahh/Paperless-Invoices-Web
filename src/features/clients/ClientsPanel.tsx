import { FileInput, Search, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/Field'
import { matchClients, partyOf } from '../../domain/clients'
import { useHydrated } from '../../hooks/useHydrated'
import { cn } from '../../lib/cn'
import { useClientsStore, useDraftStore } from '../../storage/stores'

/** Saved clients: find one, put it on the current invoice, or remove it. */
export function ClientsPanel({
  className,
  onUseClient,
}: {
  className?: string
  /** Called after a client is put on the invoice, e.g. to go back to the editor. */
  onUseClient: () => void
}) {
  const hydrated = useHydrated(useClientsStore)
  const clients = useClientsStore((state) => state.clients)
  const removeClient = useClientsStore((state) => state.removeClient)
  const hasDraft = useDraftStore((state) => state.invoice !== null)
  const updateInvoice = useDraftStore((state) => state.updateInvoice)
  const [query, setQuery] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const shown = matchClients(clients, query, Infinity)

  return (
    <Card className={cn('flex min-h-0 flex-col overflow-hidden', className)}>
      <div className="border-b border-line px-5 py-4">
        <h1 className="font-display text-lg font-semibold tracking-tight">Clients</h1>
        <p className="text-sm text-fg-subtle">
          Save clients from an invoice’s “Bill to” section to reuse them.
        </p>
      </div>

      {hydrated && clients.length > 0 && (
        <div className="relative border-b border-line px-5 py-3">
          <Search
            className="pointer-events-none absolute top-1/2 left-8 z-10 size-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden="true"
          />
          <TextField
            label="Search clients"
            className="[&_input]:pl-10 [&>label]:sr-only"
            type="search"
            placeholder="Search by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
        {!hydrated ? (
          <p className="p-4 text-sm text-fg-subtle">Loading clients…</p>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <span className="grid size-14 place-items-center rounded-lg bg-accent-soft text-accent">
              <Users className="size-6" aria-hidden="true" />
            </span>
            <p className="font-display font-semibold">No saved clients yet</p>
            <p className="max-w-xs text-sm text-fg-muted">
              Fill in “Bill to” on an invoice, then choose “Save to clients”.
            </p>
          </div>
        ) : shown.length === 0 ? (
          <p className="p-4 text-sm text-fg-subtle">No clients match “{query}”.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {shown.map((client) => (
              <li
                key={client.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{client.name}</p>
                  <p className="truncate text-sm text-fg-subtle">
                    {[client.email, client.address.split('\n')[0]].filter(Boolean).join(' · ') ||
                      'No contact details'}
                  </p>
                </div>
                {confirmingDelete === client.id ? (
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        removeClient(client.id)
                        setConfirmingDelete(null)
                      }}
                    >
                      Delete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      disabled={!hasDraft}
                      onClick={() => {
                        updateInvoice((invoice) => ({ ...invoice, to: partyOf(client) }))
                        onUseClient()
                      }}
                    >
                      <FileInput />
                      Bill to
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="size-9"
                      aria-label={`Delete ${client.name}`}
                      onClick={() => setConfirmingDelete(client.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
