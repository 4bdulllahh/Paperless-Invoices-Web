import { Download, RotateCw, TriangleAlert } from 'lucide-react'
import { Component, useState, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { downloadBlob } from '../services/download'
import { backupFileName, createBackup } from '../storage/backup'

type ErrorBoundaryState = { error: Error | null }

/**
 * Catches anything that breaks while drawing the app, so a bug shows a way out instead of a
 * blank page. Saved data lives in browser storage, not in the UI, so it's still intact.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[paperless] the app crashed', error, info.componentStack)
  }

  render() {
    return this.state.error ? <CrashScreen error={this.state.error} /> : this.props.children
  }
}

function CrashScreen({ error }: { error: Error }) {
  const [backup, setBackup] = useState<'idle' | 'saved' | 'failed'>('idle')

  async function saveBackup() {
    try {
      const file = await createBackup()
      downloadBlob(
        new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }),
        backupFileName(),
      )
      setBackup('saved')
    } catch {
      setBackup('failed')
    }
  }

  return (
    <main className="grid h-dvh place-items-center p-4">
      <div
        role="alert"
        className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-elev-2"
      >
        <span className="grid size-12 place-items-center rounded-lg bg-accent-soft text-accent">
          <TriangleAlert className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="mt-1 text-fg-muted">
            Paperless hit an unexpected problem. Your invoices and settings are still saved on this
            device. Reloading usually fixes it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => location.reload()}>
            <RotateCw />
            Reload Paperless
          </Button>
          <Button onClick={() => void saveBackup()}>
            <Download />
            Download a backup
          </Button>
        </div>
        {backup !== 'idle' && (
          <p role="status" className="text-sm text-fg-muted">
            {backup === 'saved'
              ? 'Backup saved. You can restore it from Settings.'
              : 'The backup couldn’t be created.'}
          </p>
        )}
        <details className="text-sm text-fg-subtle">
          <summary className="cursor-pointer">Technical details</summary>
          <p className="mt-2 font-mono text-xs break-words">{error.message || String(error)}</p>
        </details>
      </div>
    </main>
  )
}
