/**
 * Storage problems the user should hear about. Reported from deep inside the storage layer,
 * shown by the app shell. The latest issue is kept so problems found while loading, before
 * any UI is listening, are not lost.
 */
export type StorageIssue = {
  /** quota: storage is full. unavailable: the browser blocks storage. corrupt: saved data was unreadable. */
  kind: 'quota' | 'unavailable' | 'corrupt'
  key: string
}

type Listener = (issue: StorageIssue) => void

const listeners = new Set<Listener>()
let latest: StorageIssue | null = null

export function reportStorageIssue(issue: StorageIssue) {
  latest = issue
  console.warn(`[paperless] storage ${issue.kind}: ${issue.key}`)
  listeners.forEach((listener) => listener(issue))
}

export function onStorageIssue(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function latestStorageIssue(): StorageIssue | null {
  return latest
}

export function clearStorageIssue() {
  latest = null
}
