import { useCallback, useRef, useState } from 'react'
import type { ExportIssue } from '../../domain/export'
import { downloadDraft } from './downloadInvoice'

export type DownloadState =
  | { phase: 'idle' }
  | { phase: 'working' }
  | { phase: 'issues'; issues: ExportIssue[] }
  | { phase: 'done'; fileName: string }
  | { phase: 'error' }

/** Downloading the draft, and what to tell the user about it. */
export function useDownloadInvoice() {
  const [state, setState] = useState<DownloadState>({ phase: 'idle' })
  const busy = useRef(false)

  const download = useCallback(async () => {
    // A second click while the PDF is being made must not save or number it twice.
    if (busy.current) return
    busy.current = true
    setState({ phase: 'working' })
    try {
      const result = await downloadDraft()
      if (result.ok) setState({ phase: 'done', fileName: result.fileName })
      else if (result.issues.length > 0) setState({ phase: 'issues', issues: result.issues })
      else setState({ phase: 'idle' })
    } catch (error) {
      console.error('[paperless] download failed', error)
      setState({ phase: 'error' })
    } finally {
      busy.current = false
    }
  }, [])

  const dismiss = useCallback(() => setState({ phase: 'idle' }), [])

  return { state, download, dismiss }
}
