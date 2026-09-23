import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyPaymentDetails } from '../domain/records'
import { createSampleInvoice } from '../domain/sample'
import { idbBackend, localBackend } from './backends'
import {
  applyBackup,
  backupFileName,
  clearAllData,
  createBackup,
  parseBackup,
  type BackupFile,
} from './backup'
import {
  PERSISTED_STORES,
  useClientsStore,
  useDraftStore,
  useHistoryStore,
  useLogoStore,
  useProfileStore,
  useSettingsStore,
} from './stores'

function fillWithData() {
  useProfileStore.getState().updateBusiness({ name: 'Acme Studio', email: 'hello@acme.studio' })
  useProfileStore.getState().completeOnboarding()
  useSettingsStore.getState().updateSettings({ currency: 'EUR', locale: 'de-DE', nextSequence: 42 })
  useDraftStore.getState().startNewInvoice('2026-09-23')
  useClientsStore.getState().saveClient({
    name: 'Northwind Ltd',
    email: '',
    phone: '',
    address: '400 Market Street',
    taxId: '',
  })
  const logo = { dataUrl: 'data:image/png;base64,AAAA', width: 2, height: 1 }
  useHistoryStore.getState().recordInvoice(createSampleInvoice(), {
    payment: emptyPaymentDetails(),
    logo,
    signature: null,
    stamp: null,
  })
  useLogoStore.getState().setLogo(logo)
}

const snapshot = () =>
  Object.fromEntries(
    Object.entries(PERSISTED_STORES).map(([key, store]) => [
      key,
      JSON.parse(JSON.stringify(store.getState())),
    ]),
  )

const text = (backup: BackupFile) => JSON.stringify(backup)
const assets = { payment: emptyPaymentDetails(), logo: null, signature: null, stamp: null }

beforeEach(() => clearAllData())

describe('backups', () => {
  it('round-trips every store exactly', async () => {
    fillWithData()
    const before = snapshot()
    const file = text(await createBackup(new Date('2026-09-23T10:00:00Z')))

    await clearAllData()
    expect(useProfileStore.getState().business.name).toBe('')

    const parsed = parseBackup(file)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.backup.exportedAt).toBe('2026-09-23T10:00:00.000Z')
    await applyBackup(parsed.backup)

    expect(snapshot()).toEqual(before)
  })

  it('finishes writing before it reports the restore as done', async () => {
    // Regression: a reload right after "Restored" used to lose IndexedDB data still being written.
    fillWithData()
    const parsed = parseBackup(text(await createBackup()))
    await clearAllData()
    const write = idbBackend.setItem
    let landed = 0
    vi.spyOn(idbBackend, 'setItem').mockImplementation(async (key, value) => {
      await new Promise((resolve) => setTimeout(resolve, 30))
      await write(key, value)
      landed++
    })

    if (parsed.ok) await applyBackup(parsed.backup)

    const idbStores = Object.values(PERSISTED_STORES).filter(
      (store) => store.definition.backend === idbBackend,
    )
    expect(landed).toBe(idbStores.length)
    vi.restoreAllMocks()
  })

  it('waits for stores that are still loading', async () => {
    useHistoryStore.getState().recordInvoice(createSampleInvoice({ id: 'saved' }), assets)
    await new Promise((resolve) => setTimeout(resolve, 20)) // let IndexedDB finish writing
    void useHistoryStore.persist.rehydrate()
    expect(useHistoryStore.persist.hasHydrated()).toBe(false)

    const backup = await createBackup()

    const state = backup.stores.history.state as { entries: { invoice: { id: string } }[] }
    expect(state.entries.map((e) => e.invoice.id)).toEqual(['saved'])
  })

  it('names files by date', () => {
    expect(backupFileName(new Date(2026, 8, 23))).toBe('paperless-backup-2026-09-23.json')
  })

  it('includes quarantined data so nothing is lost', async () => {
    localBackend.setItem('paperless:draft:quarantine:1', '{"reason":"invalid JSON"}')
    await idbBackend.setItem('paperless:history:quarantine:2', '{"reason":"failed validation"}')
    const backup = await createBackup()
    expect(backup.quarantine).toEqual({
      'paperless:draft:quarantine:1': '{"reason":"invalid JSON"}',
      'paperless:history:quarantine:2': '{"reason":"failed validation"}',
    })
    expect((await createBackup()).quarantine).toBeDefined()
    await clearAllData()
    expect((await createBackup()).quarantine).toBeUndefined()
  })

  it('skips quarantined data that can no longer be read', async () => {
    localBackend.setItem('paperless:draft:quarantine:1', '{}')
    const getItem = vi.spyOn(localBackend, 'getItem').mockReturnValueOnce(null)
    expect((await createBackup()).quarantine).toBeUndefined()
    getItem.mockRestore()
  })

  it('leaves stores that are missing from the backup untouched', async () => {
    fillWithData()
    const backup = await createBackup()
    delete backup.stores.history
    await clearAllData()
    useHistoryStore.getState().recordInvoice(createSampleInvoice({ id: 'keep-me' }), assets)

    const parsed = parseBackup(text(backup))
    if (parsed.ok) await applyBackup(parsed.backup)

    expect(useProfileStore.getState().business.name).toBe('Acme Studio')
    expect(useHistoryStore.getState().entries.map((e) => e.invoice.id)).toEqual(['keep-me'])
  })

  it.each([
    ['not JSON', 'hello', 'isn’t valid JSON'],
    ['another app’s file', JSON.stringify({ app: 'other', format: 1 }), 'isn’t a Paperless backup'],
  ])('rejects %s', (_, file, message) => {
    const result = parseBackup(file)
    expect(result).toEqual({ ok: false, error: expect.stringContaining(message) })
  })

  it('rejects a store saved by a newer version of the app', async () => {
    const backup = await createBackup()
    backup.stores.settings.version = 99
    expect(parseBackup(text(backup))).toEqual({
      ok: false,
      error: expect.stringContaining('newer version'),
    })
  })

  it('upgrades history from older backups: those invoices print with the current details', async () => {
    const backup = await createBackup()
    const v1Entry = {
      id: 'entry-1',
      invoice: createSampleInvoice(),
      savedAt: '2026-09-23T10:00:00.000Z',
      status: 'unpaid',
      paidAt: null,
    }
    backup.stores.history = { version: 1, state: { entries: [v1Entry] } }

    const parsed = parseBackup(text(backup))

    expect(parsed.ok && parsed.backup.states.history).toEqual({
      entries: [{ ...v1Entry, issuedWith: null }],
      logos: {},
    })
  })

  it('imports nothing if any part is damaged', async () => {
    fillWithData()
    const backup = await createBackup()
    ;(backup.stores.history.state as { entries: unknown }).entries = 'broken'
    await clearAllData()

    const result = parseBackup(text(backup))

    expect(result).toEqual({ ok: false, error: expect.stringContaining('history data') })
    expect(useProfileStore.getState().business.name).toBe('')
  })
})

describe('clearAllData', () => {
  it('resets every store and removes everything Paperless saved', async () => {
    fillWithData()
    localBackend.setItem('paperless:theme', 'dark')
    localBackend.setItem('unrelated-site-data', 'keep')

    await clearAllData()

    for (const store of Object.values(PERSISTED_STORES)) {
      expect(store.getState()).toMatchObject(store.initialData)
    }
    expect(await idbBackend.keys()).toEqual([])
    expect(localBackend.keys()).toEqual(['unrelated-site-data'])
  })
})
