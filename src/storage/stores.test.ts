import { beforeEach, describe, expect, it } from 'vitest'
import { createSampleInvoice } from '../domain/sample'
import { clearAllData } from './backup'
import {
  initialSettings,
  useClientsStore,
  useDraftStore,
  useHistoryStore,
  useProfileStore,
  useSettingsStore,
} from './stores'

const waitForIdb = () =>
  Promise.all(
    [useClientsStore, useHistoryStore].map(
      (store) =>
        new Promise<void>((resolve) => {
          if (store.persist.hasHydrated()) resolve()
          else store.persist.onFinishHydration(() => resolve())
        }),
    ),
  )

beforeEach(async () => {
  await waitForIdb()
  await clearAllData()
})

describe('profile store', () => {
  it('updates business details and remembers onboarding', () => {
    const { updateBusiness, completeOnboarding } = useProfileStore.getState()
    updateBusiness({ name: 'Acme Studio' })
    updateBusiness({ email: 'hello@acme.studio' })
    completeOnboarding()
    expect(useProfileStore.getState()).toMatchObject({
      business: { name: 'Acme Studio', email: 'hello@acme.studio' },
      onboardingComplete: true,
    })
  })
})

describe('settings store', () => {
  it('hands out invoice sequence numbers one at a time', () => {
    const { claimSequence } = useSettingsStore.getState()
    expect(claimSequence()).toBe(1)
    expect(claimSequence()).toBe(2)
    expect(useSettingsStore.getState().nextSequence).toBe(3)
  })

  it('merges partial updates', () => {
    useSettingsStore.getState().updateSettings({ currency: 'EUR' })
    expect(useSettingsStore.getState()).toMatchObject({
      currency: 'EUR',
      taxMode: initialSettings.taxMode,
    })
  })
})

describe('draft store', () => {
  it('starts a new invoice from the current settings and profile', () => {
    useSettingsStore
      .getState()
      .updateSettings({ currency: 'GBP', nextSequence: 12, defaultTaxRate: '20' })
    useProfileStore.getState().updateBusiness({ name: 'Acme Studio' })

    const invoice = useDraftStore.getState().startNewInvoice('2026-09-23')

    expect(useDraftStore.getState().invoice).toBe(invoice)
    expect(invoice).toMatchObject({
      number: 'INV-2026-0012',
      currency: 'GBP',
      from: { name: 'Acme Studio' },
      items: [{ taxRate: '20' }],
    })
    // Starting a draft does not use up a number; downloading does.
    expect(useSettingsStore.getState().nextSequence).toBe(12)
  })

  it('updates the draft, and does nothing without one', () => {
    const { updateInvoice, startNewInvoice, clearDraft } = useDraftStore.getState()
    updateInvoice((invoice) => ({ ...invoice, notes: 'ignored' }))
    expect(useDraftStore.getState().invoice).toBeNull()

    startNewInvoice('2026-09-23')
    updateInvoice((invoice) => ({ ...invoice, notes: 'Thanks!' }))
    expect(useDraftStore.getState().invoice?.notes).toBe('Thanks!')

    clearDraft()
    expect(useDraftStore.getState().invoice).toBeNull()
  })
})

describe('clients store', () => {
  const party = { name: 'Northwind', email: 'a@northwind.com', phone: '', address: '', taxId: '' }

  it('adds, updates and removes clients', () => {
    const { saveClient, removeClient } = useClientsStore.getState()
    const id = saveClient(party)
    const createdAt = useClientsStore.getState().clients[0].createdAt

    saveClient({ ...party, name: 'Northwind Ltd' }, id)
    expect(useClientsStore.getState().clients).toEqual([
      { ...party, name: 'Northwind Ltd', id, createdAt },
    ])

    saveClient({ ...party, name: 'Contoso' })
    saveClient({ ...party, name: 'Northwind Group' }, id)
    expect(useClientsStore.getState().clients.map((c) => c.name)).toEqual([
      'Northwind Group',
      'Contoso',
    ])

    removeClient(id)
    expect(useClientsStore.getState().clients.map((c) => c.name)).toEqual(['Contoso'])
  })
})

describe('history store', () => {
  it('records snapshots newest first, and re-recording replaces the old one', () => {
    const { recordInvoice, setStatus } = useHistoryStore.getState()
    const first = createSampleInvoice({ id: 'a' })
    recordInvoice(first)
    recordInvoice(createSampleInvoice({ id: 'b' }))
    const firstEntry = useHistoryStore.getState().entries[1]
    setStatus(firstEntry.id, 'paid', '2026-09-30')

    recordInvoice({ ...first, notes: 'corrected' })

    const entries = useHistoryStore.getState().entries
    expect(entries.map((e) => e.invoice.id)).toEqual(['a', 'b'])
    expect(entries[0]).toMatchObject({
      id: firstEntry.id,
      status: 'paid',
      paidAt: '2026-09-30',
      invoice: { notes: 'corrected' },
    })
  })

  it('stores a copy that later edits cannot change', () => {
    const invoice = createSampleInvoice()
    useHistoryStore.getState().recordInvoice(invoice)
    invoice.from.name = 'Changed later'
    expect(useHistoryStore.getState().entries[0].invoice.from.name).toBe('Acme Studio')
  })

  it('clears the paid date when marked unpaid, and removes entries', () => {
    const { recordInvoice, setStatus, removeEntry } = useHistoryStore.getState()
    recordInvoice(createSampleInvoice())
    const { id } = useHistoryStore.getState().entries[0]

    setStatus(id, 'paid', '2026-09-30')
    setStatus(id, 'unpaid', '2026-09-30')
    expect(useHistoryStore.getState().entries[0]).toMatchObject({ status: 'unpaid', paidAt: null })

    setStatus('someone-else', 'paid')
    removeEntry(id)
    expect(useHistoryStore.getState().entries).toEqual([])
  })
})
