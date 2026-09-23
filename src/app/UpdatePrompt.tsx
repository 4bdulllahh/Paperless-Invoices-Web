import { CloudOff, RefreshCw, X } from 'lucide-react'
import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '../components/ui/Button'
import { flushWrites } from '../storage/persisted'

/** How often an open tab checks for a new version. */
export const UPDATE_CHECK_MS = 60 * 60 * 1000
/** How long "works offline" stays up. */
export const OFFLINE_NOTICE_MS = 6000

/**
 * Registers the service worker, then says when the app can be used offline and when a new
 * version is ready. Updates wait for the user: reloading mid-edit would be jarring.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Tabs stay open for days; look for new versions now and then.
      setInterval(() => void registration.update().catch(() => {}), UPDATE_CHECK_MS)
    },
    onRegisterError(error) {
      console.error('[paperless] offline support is unavailable', error)
    },
  })

  useEffect(() => {
    if (!offlineReady) return
    const timer = setTimeout(() => setOfflineReady(false), OFFLINE_NOTICE_MS)
    return () => clearTimeout(timer)
  }, [offlineReady, setOfflineReady])

  async function reload() {
    // Let every save land first: the page is about to be replaced.
    await flushWrites()
    await updateServiceWorker(true)
  }

  const open = needRefresh || offlineReady
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-2 bottom-22 z-60 flex justify-center sm:inset-x-auto sm:right-4 lg:bottom-4"
    >
      {open && (
        <div className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border border-line bg-surface p-3 pl-4 text-sm shadow-elev-2">
          {needRefresh ? (
            <RefreshCw className="size-4 shrink-0 text-accent" aria-hidden="true" />
          ) : (
            <CloudOff className="size-4 shrink-0 text-accent" aria-hidden="true" />
          )}
          <p className="min-w-0 flex-1">
            {needRefresh
              ? 'A new version of Paperless is ready.'
              : 'Paperless now works offline, too.'}
          </p>
          {needRefresh && (
            <Button size="sm" variant="primary" onClick={() => void reload()}>
              Reload
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={needRefresh ? 'Update later' : 'Dismiss'}
            onClick={() => {
              setNeedRefresh(false)
              setOfflineReady(false)
            }}
          >
            <X />
          </Button>
        </div>
      )}
    </div>
  )
}
