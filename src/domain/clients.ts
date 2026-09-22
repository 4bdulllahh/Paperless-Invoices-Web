import { sameParty } from './draft'
import type { Client } from './records'
import type { Party } from './schema'

const normalize = (text: string) => text.trim().toLocaleLowerCase()

/** The saved client with this name (ignoring case and surrounding spaces), if any. */
export function findClientByName(clients: readonly Client[], name: string): Client | undefined {
  const wanted = normalize(name)
  if (!wanted) return undefined
  return clients.find((client) => normalize(client.name) === wanted)
}

/**
 * Suggestions for the "Bill to" name field: clients whose name or email contains the query,
 * names that start with it first. An empty query lists everyone, alphabetically.
 */
export function matchClients(clients: readonly Client[], query: string, limit = 6): Client[] {
  const q = normalize(query)
  const byName = (a: Client, b: Client) => a.name.localeCompare(b.name)
  if (!q) return [...clients].sort(byName).slice(0, limit)
  const starts = (c: Client) => normalize(c.name).startsWith(q)
  return clients
    .filter((c) => normalize(c.name).includes(q) || normalize(c.email).includes(q))
    .sort((a, b) => Number(starts(b)) - Number(starts(a)) || byName(a, b))
    .slice(0, limit)
}

export type SaveClientState =
  | { kind: 'empty' }
  | { kind: 'new' }
  | { kind: 'saved'; client: Client }
  | { kind: 'changed'; client: Client }

/** Whether the invoice's "Bill to" can be saved as a new client, updates one, or is already saved. */
export function saveClientState(clients: readonly Client[], party: Party): SaveClientState {
  if (!party.name.trim()) return { kind: 'empty' }
  const client = findClientByName(clients, party.name)
  if (!client) return { kind: 'new' }
  const { id: _id, createdAt: _createdAt, ...saved } = client
  return sameParty(saved, party) ? { kind: 'saved', client } : { kind: 'changed', client }
}

/** Just the party details of a saved client, for copying onto an invoice. */
export function partyOf({ name, email, phone, address, taxId }: Client): Party {
  return { name, email, phone, address, taxId }
}
