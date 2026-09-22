import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyParty } from '../../domain/draft'
import { clearAllData } from '../../storage/backup'
import { useClientsStore, useDraftStore } from '../../storage/stores'
import { ClientsPanel } from './ClientsPanel'

const add = (name: string, email = '') =>
  useClientsStore.getState().saveClient({ ...emptyParty(), name, email })

beforeEach(async () => {
  await clearAllData()
  useDraftStore.getState().startNewInvoice('2026-09-23')
})

describe('ClientsPanel', () => {
  it('explains how to save clients when there are none', () => {
    render(<ClientsPanel onUseClient={vi.fn()} />)
    expect(screen.getByText('No saved clients yet')).toBeInTheDocument()
  })

  it('searches by name or email', () => {
    add('Northwind Ltd', 'accounts@northwind.com')
    add('Contoso', 'billing@contoso.com')
    render(<ClientsPanel onUseClient={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Search clients'), { target: { value: 'billing' } })
    expect(screen.getByText('Contoso')).toBeInTheDocument()
    expect(screen.queryByText('Northwind Ltd')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Search clients'), { target: { value: 'zzz' } })
    expect(screen.getByText('No clients match “zzz”.')).toBeInTheDocument()
  })

  it('puts a client on the current invoice', () => {
    add('Northwind Ltd', 'accounts@northwind.com')
    const onUseClient = vi.fn()
    render(<ClientsPanel onUseClient={onUseClient} />)

    fireEvent.click(screen.getByRole('button', { name: 'Bill to' }))

    expect(useDraftStore.getState().invoice?.to).toMatchObject({ name: 'Northwind Ltd' })
    expect(onUseClient).toHaveBeenCalledOnce()
  })

  it('deletes a client only after confirming', () => {
    add('Northwind Ltd')
    render(<ClientsPanel onUseClient={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete Northwind Ltd' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(useClientsStore.getState().clients).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Delete Northwind Ltd' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(useClientsStore.getState().clients).toHaveLength(0)
  })
})
