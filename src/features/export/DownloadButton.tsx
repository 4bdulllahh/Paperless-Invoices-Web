import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Download,
  FilePlus2,
  LoaderCircle,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { Button } from '../../components/ui/Button'
import { countryInSentence } from '../../domain/countries'
import type { ExportSection } from '../../domain/export'
import { useDraftStore } from '../../storage/stores'
import { SECTION_LABELS } from '../editor/revealSection'
import { useDownloadInvoice } from './useDownloadInvoice'

/** How long the "Downloaded" note stays up. */
export const DONE_NOTICE_MS = 6000

type DownloadButtonProps = {
  /** Take the user to an editor section that needs filling in. */
  onFixIssue: (section: ExportSection) => void
}

/**
 * Download PDF, plus what happened: what to fill in first, that it worked, or that it didn't.
 * The note opens under the button, so the page itself never grows or scrolls.
 */
export function DownloadButton({ onFixIssue }: DownloadButtonProps) {
  const hasDraft = useDraftStore((state) => state.invoice !== null)
  const country = useDraftStore((state) => state.invoice?.country ?? '')
  const { state, download, dismiss } = useDownloadInvoice()
  const wrapper = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const working = state.phase === 'working'
  const open = state.phase === 'issues' || state.phase === 'done' || state.phase === 'error'
  // Only legal warnings left: the user may download anyway.
  const onlyWarnings = state.phase === 'issues' && state.issues.every((issue) => issue.legal)

  // Move focus to the list of problems, so keyboard and screen reader users land on it.
  useEffect(() => {
    if (state.phase === 'issues') panel.current?.focus()
  }, [state])

  /**
   * Close the note. Focus goes back to the button when asked, or when it was inside the note
   * (it would otherwise be lost). A click elsewhere keeps focus where the user put it.
   */
  const close = useCallback(
    (returnFocus = false) => {
      const focusInside = panel.current?.contains(document.activeElement) ?? false
      dismiss()
      if (returnFocus || focusInside) button.current?.focus()
    },
    [dismiss],
  )

  useEffect(() => {
    if (state.phase !== 'done') return
    const timer = setTimeout(close, DONE_NOTICE_MS)
    return () => clearTimeout(timer)
  }, [state, close])

  // Close on Escape or a click elsewhere.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(true)
    const onPointer = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) dismiss()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, close, dismiss])

  return (
    <div ref={wrapper} className="relative">
      <Button
        ref={button}
        variant="primary"
        // No need to wait for saved data to load here: downloading waits for it.
        disabled={!hasDraft}
        aria-busy={working || undefined}
        aria-label={working ? 'Preparing PDF…' : 'Download PDF'}
        onClick={() => void download()}
      >
        {working ? <LoaderCircle className="animate-spin" /> : <Download />}
        <span className="hidden sm:inline">{working ? 'Preparing…' : 'Download PDF'}</span>
        <span className="sm:hidden">PDF</span>
      </Button>

      {/* Announced by screen readers whenever the message inside changes. */}
      <div aria-live="polite" className="sr-only">
        {state.phase === 'done' && `Downloaded ${state.fileName}. Saved to History.`}
      </div>

      {open && (
        <div
          ref={panel}
          tabIndex={-1}
          // The download note is announced by the live region above; errors interrupt.
          role={state.phase === 'issues' ? 'dialog' : state.phase === 'error' ? 'alert' : undefined}
          aria-labelledby="download-note-title"
          className="absolute top-full right-0 z-30 mt-2 flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-3 rounded-lg border border-line bg-surface p-4 text-sm shadow-elev-2 focus:outline-none"
        >
          <div className="flex items-start gap-2.5">
            {state.phase === 'done' ? (
              <CircleCheck className="mt-0.5 size-4.5 shrink-0 text-accent" aria-hidden="true" />
            ) : (
              <CircleAlert className="mt-0.5 size-4.5 shrink-0 text-accent" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p id="download-note-title" className="font-display font-semibold">
                {state.phase === 'issues'
                  ? onlyWarnings
                    ? 'Missing for a legal invoice'
                    : 'A few things before you download'
                  : state.phase === 'done'
                    ? 'Downloaded and saved to History'
                    : 'The PDF couldn’t be created'}
              </p>
              {state.phase === 'done' && (
                <p className="truncate text-fg-subtle" title={state.fileName}>
                  {state.fileName}
                </p>
              )}
              {state.phase === 'error' && (
                <p className="text-fg-muted">Nothing was saved. Please try again.</p>
              )}
              {onlyWarnings && country && (
                <p className="text-fg-muted">
                  Invoices in {countryInSentence(country)} need these by law. You can still
                  download.
                </p>
              )}
            </div>
            <Button
              size="icon-sm"
              variant="ghost"
              className="-mt-1 -mr-1"
              aria-label="Close"
              onClick={() => close(true)}
            >
              <X />
            </Button>
          </div>

          {state.phase === 'issues' && (
            <ul className="flex flex-col gap-1.5">
              {state.issues.map((issue) => (
                <li key={issue.message}>
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-3 rounded-md bg-surface-muted px-3 py-2.5 text-left transition hover:bg-surface-sunken"
                    onClick={() => {
                      dismiss()
                      onFixIssue(issue.section)
                    }}
                  >
                    <span className="min-w-0 flex-1">
                      {issue.legal && <span className="sr-only">Advised: </span>}
                      {issue.message}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-fg-subtle">
                      {SECTION_LABELS[issue.section]}
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {onlyWarnings && (
            <Button
              size="sm"
              className="self-start"
              onClick={() => {
                button.current?.focus()
                void download(true)
              }}
            >
              <Download />
              Download anyway
            </Button>
          )}
          {state.phase === 'done' && (
            <Button
              size="sm"
              className="self-start"
              onClick={() => {
                useDraftStore.getState().startNewInvoice()
                close(true)
              }}
            >
              <FilePlus2 />
              Start a new invoice
            </Button>
          )}
          {state.phase === 'error' && (
            <Button
              size="sm"
              className="self-start"
              onClick={() => {
                button.current?.focus()
                void download()
              }}
            >
              Try again
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
