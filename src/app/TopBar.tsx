import { Download, Moon, Sun } from 'lucide-react'
import { CraneMark } from '../components/brand/CraneMark'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import type { ResolvedTheme } from '../hooks/useTheme'
import { useDraftStore } from '../storage/stores'

type TopBarProps = {
  theme: ResolvedTheme
  onToggleTheme: () => void
}

export function TopBar({ theme, onToggleTheme }: TopBarProps) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const number = useDraftStore((state) => state.invoice?.number)
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 rounded-xl border border-line bg-surface/80 px-3 shadow-elev-1 backdrop-blur-md sm:px-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-10 place-items-center rounded-md bg-flame text-ink">
          <CraneMark className="w-7" strokeWidth={1.25} />
        </span>
        <span className="font-display text-lg font-semibold tracking-tight">Paperless</span>
      </div>

      {number && (
        <div className="ml-2 hidden items-center gap-2.5 border-l border-line pl-4 sm:flex">
          <span className="font-display text-sm font-medium text-fg-muted tabular-nums">
            {number}
          </span>
          <Badge dot>Draft</Badge>
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
        <Button variant="primary" disabled title="PDF export arrives in Milestone 8">
          <Download />
          <span className="hidden sm:inline">Download PDF</span>
          <span className="sm:hidden">PDF</span>
        </Button>
      </div>
    </header>
  )
}
