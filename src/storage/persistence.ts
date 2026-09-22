/**
 * Browsers may clear a site's storage when space runs low, and Safari clears it after 7 days
 * without a visit. Asking for persistent storage opts out where the browser allows it.
 */

export type StorageStatus = {
  /** Bytes used by this site, if the browser reports it. */
  usage: number | null
  quota: number | null
  /** Whether the browser has promised not to clear this site's data automatically. */
  persisted: boolean | null
}

export async function getStorageStatus(): Promise<StorageStatus> {
  // Missing in older browsers and in insecure (http) contexts.
  const storage = navigator.storage as StorageManager | undefined
  const [estimate, persisted] = await Promise.all([
    storage?.estimate?.().catch(() => undefined),
    storage?.persisted?.().catch(() => null),
  ])
  return {
    usage: estimate?.usage ?? null,
    quota: estimate?.quota ?? null,
    persisted: persisted ?? null,
  }
}

/** Returns true if the browser granted persistent storage. Some browsers ask the user first. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}
