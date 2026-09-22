import { useId, useState, type KeyboardEvent } from 'react'
import { TextField } from '../../components/ui/Field'
import { matchClients } from '../../domain/clients'
import type { Client } from '../../domain/records'
import { cn } from '../../lib/cn'

type ClientComboboxProps = {
  value: string
  onChange: (name: string) => void
  clients: readonly Client[]
  onSelect: (client: Client) => void
}

/**
 * The "Bill to" name field, suggesting saved clients as you type (ARIA combobox pattern).
 * Arrow keys move through suggestions, Enter picks one, Escape closes the list.
 */
export function ClientCombobox({ value, onChange, clients, onSelect }: ClientComboboxProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const matches = matchClients(clients, value)
  const showList = open && matches.length > 0

  function choose(client: Client) {
    onSelect(client)
    setOpen(false)
    setActive(-1)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (matches.length === 0) return
      event.preventDefault()
      setOpen(true)
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + step + matches.length) % matches.length)
    } else if (event.key === 'Enter' && showList && active >= 0) {
      event.preventDefault()
      choose(matches[active])
    } else if (event.key === 'Escape' && showList) {
      event.preventDefault()
      setOpen(false)
      setActive(-1)
    }
  }

  return (
    <div className="relative">
      <TextField
        label="Client name"
        placeholder="Northwind Ltd"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false)
          setActive(-1)
        }}
        onKeyDown={handleKeyDown}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Saved clients"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-elev-2"
        >
          {matches.map((client, index) => (
            <li
              key={client.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              // Keep focus in the input so the list doesn't close before the click lands.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(client)}
              onMouseEnter={() => setActive(index)}
              className={cn(
                'cursor-pointer rounded-md px-3 py-2',
                index === active ? 'bg-accent-soft' : 'hover:bg-surface-muted',
              )}
            >
              <span className="block text-sm font-medium">{client.name}</span>
              {client.email && <span className="block text-xs text-fg-subtle">{client.email}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
