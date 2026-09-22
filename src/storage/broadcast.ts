/**
 * Tells other open Paperless tabs when saved data changes, so they reload it instead of
 * overwriting it with stale data. Works for both localStorage and IndexedDB.
 */

const CHANNEL_NAME = 'paperless-storage'

type ChangeMessage = { key: string }

const channel: BroadcastChannel | null =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME)

// Node (tests) would otherwise keep the process alive for an open channel.
;(channel as unknown as { unref?: () => void } | null)?.unref?.()

/** One listener for the channel, routing each message to the callbacks for its key. */
const callbacks = new Map<string, Set<() => void>>()

channel?.addEventListener('message', (event: MessageEvent<ChangeMessage>) => {
  const key = event.data?.key
  if (typeof key === 'string') callbacks.get(key)?.forEach((callback) => callback())
})

export function announceChange(key: string) {
  channel?.postMessage({ key } satisfies ChangeMessage)
}

export function onRemoteChange(key: string, callback: () => void): () => void {
  if (!channel) return () => {}
  const forKey = callbacks.get(key) ?? new Set()
  forKey.add(callback)
  callbacks.set(key, forKey)
  return () => forKey.delete(callback)
}
