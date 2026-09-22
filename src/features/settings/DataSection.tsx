import { Download, HardDrive, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { formatBytes } from '../../lib/formatBytes'
import { downloadBlob } from '../../services/download'
import {
  applyBackup,
  backupFileName,
  clearAllData,
  createBackup,
  parseBackup,
  type ParsedBackup,
} from '../../storage/backup'
import {
  getStorageStatus,
  requestPersistentStorage,
  type StorageStatus,
} from '../../storage/persistence'
import { cn } from '../../lib/cn'

type Status = { tone: 'success' | 'error'; text: string }

const formatWhen = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  )

/** Backup, restore and erase: the user's only copy of their data lives in this browser. */
export function DataSection() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [storage, setStorage] = useState<StorageStatus | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [pendingImport, setPendingImport] = useState<ParsedBackup | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const refreshStorage = useCallback(() => {
    void getStorageStatus().then(setStorage)
  }, [])
  useEffect(refreshStorage, [refreshStorage])

  async function exportBackup() {
    const backup = await createBackup()
    const fileName = backupFileName()
    downloadBlob(
      new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
      fileName,
    )
    setStatus({ tone: 'success', text: `Backup saved as ${fileName}.` })
  }

  async function chooseBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow choosing the same file again
    if (!file) return
    const result = parseBackup(await file.text())
    setConfirmingDelete(false)
    if (result.ok) {
      setPendingImport(result.backup)
      setStatus(null)
    } else {
      setPendingImport(null)
      setStatus({ tone: 'error', text: result.error })
    }
  }

  async function confirmImport() {
    if (!pendingImport) return
    await applyBackup(pendingImport)
    setStatus({
      tone: 'success',
      text: `Restored the backup from ${formatWhen(pendingImport.exportedAt)}.`,
    })
    setPendingImport(null)
    refreshStorage()
  }

  async function confirmDelete() {
    await clearAllData()
    setConfirmingDelete(false)
    setStatus({ tone: 'success', text: 'All Paperless data was deleted from this browser.' })
    refreshStorage()
  }

  async function protect() {
    const granted = await requestPersistentStorage()
    setStatus(
      granted
        ? { tone: 'success', text: 'Your browser will no longer clear Paperless data on its own.' }
        : {
            tone: 'error',
            text: 'Your browser declined. Export backups regularly to keep a safe copy.',
          },
    )
    refreshStorage()
  }

  return (
    <section aria-labelledby="data-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="data-heading" className="font-display text-lg font-semibold tracking-tight">
          Your data
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          Everything is saved only in this browser. Nothing is uploaded. Export a backup to keep a
          copy or move to another device.
        </p>
      </div>

      <dl className="grid gap-2 rounded-lg bg-surface-muted p-4 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <HardDrive className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
          <dt className="text-fg-subtle">Storage used</dt>
          <dd className="ml-auto font-medium tabular-nums sm:ml-0">
            {storage?.usage != null ? formatBytes(storage.usage) : '—'}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
          <dt className="text-fg-subtle">Protected from clearing</dt>
          <dd className="ml-auto flex items-center gap-2 font-medium sm:ml-0">
            {storage?.persisted == null ? '—' : storage.persisted ? 'Yes' : 'No'}
            {storage?.persisted === false && (
              <Button size="sm" variant="ghost" className="-my-2 h-7 px-2.5" onClick={protect}>
                Protect
              </Button>
            )}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button onClick={exportBackup}>
          <Download />
          Export backup
        </Button>
        <Button onClick={() => fileInput.current?.click()}>
          <Upload />
          Import backup
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={chooseBackup}
          aria-label="Backup file"
          data-testid="backup-file-input"
        />
      </div>

      {pendingImport && (
        <div className="flex flex-col gap-3 rounded-lg border border-line-strong p-4 text-sm">
          <p>
            Replace your current data with the backup from{' '}
            <strong>{formatWhen(pendingImport.exportedAt)}</strong>? Anything not in the backup
            stays as it is.
          </p>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={confirmImport}>
              Replace data
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPendingImport(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-line pt-4">
        {confirmingDelete ? (
          <div className="flex flex-col gap-3 rounded-lg border border-accent/60 bg-accent-soft p-4 text-sm">
            <p>
              This permanently deletes your business details, settings, current draft, clients and
              invoice history from this browser. It can’t be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={confirmDelete}>
                <Trash2 />
                Delete everything
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button variant="danger" size="sm" onClick={() => setConfirmingDelete(true)}>
              <Trash2 />
              Delete all data
            </Button>
          </div>
        )}
      </div>

      <p
        role="status"
        className={cn(
          'min-h-5 text-sm',
          status?.tone === 'error' ? 'font-medium text-fg' : 'text-fg-muted',
        )}
      >
        {status?.text}
      </p>
    </section>
  )
}
