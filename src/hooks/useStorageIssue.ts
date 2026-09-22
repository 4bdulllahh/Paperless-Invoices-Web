import { useCallback, useEffect, useState } from 'react'
import {
  clearStorageIssue,
  latestStorageIssue,
  onStorageIssue,
  type StorageIssue,
} from '../storage/events'

/** The most recent storage problem, including ones found before the app rendered. */
export function useStorageIssue() {
  const [issue, setIssue] = useState<StorageIssue | null>(latestStorageIssue)
  useEffect(() => onStorageIssue(setIssue), [])
  const dismiss = useCallback(() => {
    clearStorageIssue()
    setIssue(null)
  }, [])
  return { issue, dismiss }
}
