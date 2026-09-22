import { describe, expect, it } from 'vitest'
import { findClientByName, matchClients, partyOf, saveClientState } from './clients'
import { emptyParty } from './draft'
import type { Client } from './records'

const client = (name: string, email = ''): Client => ({
  ...emptyParty(),
  name,
  email,
  id: `id-${name}`,
  createdAt: '2026-09-01T00:00:00.000Z',
})

const clients = [
  client('Northwind Ltd', 'accounts@northwind.com'),
  client('Contoso', 'billing@contoso.com'),
  client('Fabrikam North', 'ap@fabrikam.com'),
  client('Adventure Works', 'north@adventure.works'),
]

describe('findClientByName', () => {
  it('ignores case and surrounding spaces', () => {
    expect(findClientByName(clients, '  northwind ltd ')?.id).toBe('id-Northwind Ltd')
    expect(findClientByName(clients, 'Northwind')).toBeUndefined()
    expect(findClientByName(clients, '   ')).toBeUndefined()
  })
})

describe('matchClients', () => {
  it('matches names and emails, names that start with the query first', () => {
    expect(matchClients(clients, 'north').map((c) => c.name)).toEqual([
      'Northwind Ltd',
      'Adventure Works',
      'Fabrikam North',
    ])
  })

  it('lists everyone alphabetically for an empty query, up to the limit', () => {
    expect(matchClients(clients, '').map((c) => c.name)).toEqual([
      'Adventure Works',
      'Contoso',
      'Fabrikam North',
      'Northwind Ltd',
    ])
    expect(matchClients(clients, '', 2)).toHaveLength(2)
  })

  it('returns nothing when nobody matches', () => {
    expect(matchClients(clients, 'zzz')).toEqual([])
  })
})

describe('saveClientState', () => {
  const saved = clients[0]

  it('needs a name', () => {
    expect(saveClientState(clients, emptyParty())).toEqual({ kind: 'empty' })
  })

  it('offers to save someone new', () => {
    expect(saveClientState(clients, { ...emptyParty(), name: 'Initech' })).toEqual({ kind: 'new' })
  })

  it('recognises a client that is already saved', () => {
    expect(saveClientState(clients, partyOf(saved))).toEqual({ kind: 'saved', client: saved })
  })

  it('offers to update a saved client whose details changed', () => {
    const changed = { ...partyOf(saved), address: 'New address' }
    expect(saveClientState(clients, changed)).toEqual({ kind: 'changed', client: saved })
  })
})
