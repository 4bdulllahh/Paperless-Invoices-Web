import { TriangleAlert, X } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useStorageIssue } from '../hooks/useStorageIssue'
import type { StorageIssue } from '../storage/events'

const MESSAGES: Record<StorageIssue['kind'], string> = {
  quota:
    'Storage for Paperless is full, so recent changes may not be saved. Export a backup from Settings, then delete old invoices.',
  unavailable:
    'This browser is blocking storage (private browsing or site settings), so your work won’t be kept after you close the tab.',
  corrupt:
    'Some saved data couldn’t be read, so that part started fresh. The unreadable copy is kept and included in backups.',
}

export function StorageIssueBanner() {
  const { issue, dismiss } = useStorageIssue()
  if (!issue) return null
  return (
    <div
      role="alert"
      className="flex shrink-0 items-start gap-3 rounded-lg border border-accent/40 bg-accent-soft px-4 py-3 text-sm text-fg"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
      <p className="flex-1">{MESSAGES[issue.kind]}</p>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={dismiss}
        aria-label="Dismiss"
        className="-my-1"
      >
        <X />
      </Button>
    </div>
  )
}
