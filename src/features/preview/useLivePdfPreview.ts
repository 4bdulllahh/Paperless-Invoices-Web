import { useEffect, useRef, useState } from 'react'
import { useHydrated } from '../../hooks/useHydrated'
import type { PreviewPage } from '../../services/pdf'
import { useDraftStore, useLogoStore, useProfileStore } from '../../storage/stores'
import { buildTemplateProps } from '../../templates/props'

export type PreviewStatus = 'loading' | 'ready' | 'updating' | 'error'

/** Pause after the last edit before redrawing, so typing stays smooth. */
export const PREVIEW_DELAY_MS = 350

/**
 * The current draft rendered as the real PDF, page by page. Redraws shortly after each change;
 * the previous pages stay on screen meanwhile, and results that arrive out of order are dropped.
 */
export function useLivePdfPreview() {
  const invoice = useDraftStore((state) => state.invoice)
  const logo = useLogoStore((state) => state.logo)
  const logoReady = useHydrated(useLogoStore)
  const payment = useProfileStore((state) => state.payment)
  const [pages, setPages] = useState<PreviewPage[] | null>(null)
  const [status, setStatus] = useState<PreviewStatus>('loading')
  const latestRequest = useRef(0)
  const shown = useRef<PreviewPage[]>([])
  const firstDraw = useRef(true)

  useEffect(() => {
    // Wait for the logo to load from IndexedDB, or the first page would be drawn without it.
    if (!invoice || !logoReady) return
    const request = ++latestRequest.current
    const delay = firstDraw.current ? 0 : PREVIEW_DELAY_MS
    firstDraw.current = false

    const timer = setTimeout(async () => {
      setStatus((current) => (current === 'loading' ? 'loading' : 'updating'))
      try {
        const { renderPreview } = await import('../../services/pdf')
        const next = await renderPreview(buildTemplateProps(invoice, logo, payment))
        if (request !== latestRequest.current) {
          next.forEach((page) => URL.revokeObjectURL(page.url))
          return
        }
        shown.current.forEach((page) => URL.revokeObjectURL(page.url))
        shown.current = next
        setPages(next)
        setStatus('ready')
      } catch (error) {
        if (request !== latestRequest.current) return
        console.error('[paperless] preview failed', error)
        setStatus('error')
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [invoice, logo, logoReady, payment])

  // Load the PDF engine shortly after start-up, even before there's an invoice to draw (a new
  // visitor is still in the setup wizard), so the first preview doesn't wait on the network.
  useEffect(() => {
    const timer = setTimeout(() => {
      void import('../../services/pdf').then((engine) => engine.warmUp?.()).catch(() => {})
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  // Free the page images when the preview goes away.
  useEffect(() => {
    const images = shown
    return () => images.current.forEach((page) => URL.revokeObjectURL(page.url))
  }, [])

  return { pages, status }
}
