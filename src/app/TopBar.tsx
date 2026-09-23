import { Moon, Sun } from 'lucide-react'
import { useMemo } from 'react'
import { CraneMark } from '../components/brand/CraneMark'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { draftState, type DraftState, type ExportSection } from '../domain/export'
import { DownloadButton } from '../features/export/DownloadButton'
import type { ResolvedTheme } from '../hooks/useTheme'
import { useDraftStore, useHistoryStore } from '../storage/stores'

type TopBarProps = {
  theme: ResolvedTheme
  onToggleTheme: () => void
  /** Take the user to an editor section that must be filled in before downloading. */
  onFixIssue: (section: ExportSection) => void
}

const DRAFT_BADGES: Record<DraftState, { label: string; title: string }> = {
  draft: { label: 'Draft', title: 'Not downloaded yet' },
  downloaded: { label: 'Downloaded', title: 'Saved in History exactly as shown' },
  edited: {
    label: 'Edited',
    title: 'Changed since it was downloaded. Download again to update History.',
  },
}

export function TopBar({ theme, onToggleTheme, onFixIssue }: TopBarProps) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const invoice = useDraftStore((state) => state.invoice)
  const history = useHistoryStore((state) => state.entries)
  const badge = useMemo(
    () => (invoice ? DRAFT_BADGES[draftState(invoice, history)] : null),
    [invoice, history],
  )

  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center gap-3 rounded-xl border border-line bg-surface/80 px-3 shadow-elev-1 backdrop-blur-md sm:px-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-10 place-items-center rounded-md bg-flame text-ink">
          <CraneMark className="w-7" strokeWidth={1.25} />
        </span>
        <span className="font-display text-lg font-semibold tracking-tight">Paperless</span>
      </div>

      {invoice && badge && (
        <div className="ml-2 hidden min-w-0 items-center gap-2.5 border-l border-line pl-4 sm:flex">
          <span className="truncate font-display text-sm font-medium text-fg-muted tabular-nums">
            {invoice.number}
          </span>
          <Badge dot title={badge.title}>
            {badge.label}
          </Badge>
        </div>
      )}

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleTheme}
          aria-label={`Switch to ${nextTheme} theme`}
          title={`Switch to ${nextTheme} theme`}
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>
        <DownloadButton onFixIssue={onFixIssue} />
      </div>
    </header>
  )
}
