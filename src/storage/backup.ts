import { z } from 'zod'
import { todayIso } from '../domain/dates'
import { idbBackend, localBackend, STORAGE_PREFIX, type StorageBackend } from './backends'
import { flushWrites, runMigrations, type PersistedStore } from './persisted'
import { PERSISTED_STORES, type StoreKey } from './stores'

/**
 * Backup files: every saved store with its schema version, so older backups can be migrated
 * forward on import. Quarantined (unreadable) data is included so nothing is ever lost for good.
 */

const BACKUP_FORMAT = 1

const backupFileSchema = z.object({
  app: z.literal('paperless'),
  format: z.literal(BACKUP_FORMAT),
  exportedAt: z.iso.datetime(),
  stores: z.record(z.string(), z.object({ version: z.number().int().min(0), state: z.unknown() })),
  quarantine: z.record(z.string(), z.string()).optional(),
})

export type BackupFile = z.infer<typeof backupFileSchema>

export type ParsedBackup = {
  exportedAt: string
  states: Partial<Record<StoreKey, object>>
}

type AnyStore = PersistedStore<object, object>
const storeEntries = () => Object.entries(PERSISTED_STORES) as [StoreKey, AnyStore][]

function waitForHydration(store: AnyStore): Promise<void> {
  if (store.persist.hasHydrated()) return Promise.resolve()
  return new Promise((resolve) => {
    const unsubscribe = store.persist.onFinishHydration(() => {
      unsubscribe()
      resolve()
    })
  })
}

function dataOf(store: AnyStore): object {
  const state = store.getState() as Record<string, unknown>
  return Object.fromEntries(Object.keys(store.initialData).map((key) => [key, state[key]]))
}

async function prefixedKeys(backend: StorageBackend): Promise<string[]> {
  return (await backend.keys()).filter((key) => key.startsWith(STORAGE_PREFIX))
}

async function collectQuarantine(): Promise<Record<string, string>> {
  const found: Record<string, string> = {}
  for (const backend of [localBackend, idbBackend]) {
    for (const key of await prefixedKeys(backend)) {
      if (!key.includes(':quarantine:')) continue
      const value = await backend.getItem(key)
      if (value !== null) found[key] = value
    }
  }
  return found
}

export async function createBackup(now = new Date()): Promise<BackupFile> {
  const entries = storeEntries()
  await Promise.all(entries.map(([, store]) => waitForHydration(store)))
  const quarantine = await collectQuarantine()
  return {
    app: 'paperless',
    format: BACKUP_FORMAT,
    exportedAt: now.toISOString(),
    stores: Object.fromEntries(
      entries.map(([key, store]) => [
        key,
        { version: store.definition.version, state: dataOf(store) },
      ]),
    ),
    ...(Object.keys(quarantine).length > 0 && { quarantine }),
  }
}

export function backupFileName(now = new Date()): string {
  return `paperless-backup-${todayIso(now)}.json`
}

/**
 * Check a backup file without changing anything. All-or-nothing: if any part is invalid,
 * the whole backup is rejected with a readable reason.
 */
export function parseBackup(
  text: string,
): { ok: true; backup: ParsedBackup } | { ok: false; error: string } {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file isn’t a Paperless backup (it isn’t valid JSON).' }
  }
  const file = backupFileSchema.safeParse(json)
  if (!file.success) {
    return { ok: false, error: 'This file isn’t a Paperless backup, or it’s from a newer version.' }
  }

  const states: ParsedBackup['states'] = {}
  for (const [key, store] of storeEntries()) {
    const saved = file.data.stores[key]
    if (!saved) continue
    const { definition } = store
    if (saved.version > definition.version) {
      return {
        ok: false,
        error:
          'This backup is from a newer version of Paperless. Reload the page to update, then try again.',
      }
    }
    const migrated = runMigrations(
      saved.state,
      saved.version,
      definition.version,
      definition.migrations,
    )
    const result = definition.schema.safeParse(migrated)
    if (!result.success) {
      return {
        ok: false,
        error: `The ${key} data in this backup is damaged, so nothing was imported.`,
      }
    }
    states[key] = result.data
  }
  return { ok: true, backup: { exportedAt: file.data.exportedAt, states } }
}

/**
 * Replace saved data with a parsed backup. Parts missing from the backup are left as they are.
 * Resolves once everything is written, so the user can safely reload or close the tab.
 */
export async function applyBackup(backup: ParsedBackup) {
  for (const [key, store] of storeEntries()) {
    const state = backup.states[key]
    if (state) store.setState(state)
  }
  await flushWrites()
}

/** Erase everything Paperless has stored in this browser and return to a first-visit state. */
export async function clearAllData() {
  for (const [, store] of storeEntries()) store.setState(store.initialData)
  // Let the resets land first, so none of them can re-create a key after it's removed.
  await flushWrites()
  for (const backend of [localBackend, idbBackend]) {
    for (const key of await prefixedKeys(backend)) await backend.removeItem(key)
  }
}
