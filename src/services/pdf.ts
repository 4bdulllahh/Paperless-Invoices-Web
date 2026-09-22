/**
 * PDF generation and preview rasterising. Heavy (react-pdf and pdf.js), so this module is only
 * ever loaded with a dynamic import() and never lands in the main bundle.
 *
 * Both engines run off the main thread: react-pdf in our own Web Worker, pdf.js in its worker.
 */
import { getDocument, GlobalWorkerOptions, PDFWorker } from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { TemplateProps } from '../templates/layout'
import type { PdfRequest, PdfResponse } from './pdf.worker'

GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

const fontBase = () => new URL(`${import.meta.env.BASE_URL}fonts`, location.href).href

/* react-pdf in a Web Worker, with the main thread as a fallback */

type Pending = { resolve: (bytes: Uint8Array) => void; reject: (error: Error) => void }

let renderer: Worker | null | undefined
let nextId = 0
const pending = new Map<number, Pending>()

function getRenderer(): Worker | null {
  if (renderer !== undefined) return renderer
  try {
    renderer = new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' })
    renderer.addEventListener('message', ({ data }: MessageEvent<PdfResponse>) => {
      const request = pending.get(data.id)
      if (!request) return
      pending.delete(data.id)
      if ('bytes' in data) request.resolve(data.bytes)
      else request.reject(new Error(data.error))
    })
    renderer.addEventListener('error', () => {
      // The worker couldn't start or crashed: fail what's in flight and stop using it.
      renderer = null
      pending.forEach((request) => request.reject(new Error('PDF worker failed')))
      pending.clear()
    })
  } catch {
    renderer = null
  }
  return renderer
}

async function renderOnMainThread(props: TemplateProps): Promise<Uint8Array> {
  const { renderPdfBytes } = await import('../templates/render')
  return renderPdfBytes(props, fontBase())
}

async function renderBytes(props: TemplateProps): Promise<Uint8Array> {
  const worker = getRenderer()
  if (!worker) return renderOnMainThread(props)
  try {
    return await new Promise<Uint8Array>((resolve, reject) => {
      const id = ++nextId
      pending.set(id, { resolve, reject })
      worker.postMessage({ id, props, fontBase: fontBase() } satisfies PdfRequest)
    })
  } catch {
    return renderOnMainThread(props)
  }
}

/** The invoice as a PDF file, exactly as it will be downloaded. */
export async function renderInvoicePdf(props: TemplateProps): Promise<Blob> {
  const bytes = await renderBytes(props)
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
}

/* pdf.js, reusing one worker: starting a new one costs ~250 ms per redraw */

let pdfjsWorker: PDFWorker | undefined

export type PreviewPage = {
  /** Object URL of a PNG; revoke it when the page is no longer shown. */
  url: string
  width: number
  height: number
}

/**
 * Draw each page of a PDF to an image with pdf.js, so the preview shows the real file rather
 * than an HTML imitation of it. 1240px wide is about 150 dpi on A4: sharp on high-DPI screens.
 */
export async function rasterizePdf(file: Blob, width = 1240): Promise<PreviewPage[]> {
  pdfjsWorker ??= new PDFWorker()
  const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()), worker: pdfjsWorker })
  try {
    const doc = await task.promise
    const pages: PreviewPage[] = []
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      await page.render({ canvas, viewport }).promise
      const png = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))),
          'image/png',
        ),
      )
      pages.push({ url: URL.createObjectURL(png), width: canvas.width, height: canvas.height })
    }
    return pages
  } finally {
    // Destroys this document only; the shared worker stays up for the next redraw.
    await task.destroy()
  }
}

/**
 * Start both workers ahead of time (downloading ~2.5 MB of PDF engine), e.g. while a new
 * visitor is still in the setup wizard, so their first preview appears without a wait.
 */
export function warmUp() {
  getRenderer()
  pdfjsWorker ??= new PDFWorker()
}

/** Render and rasterise in one step, for the live preview. */
export async function renderPreview(props: TemplateProps): Promise<PreviewPage[]> {
  return rasterizePdf(await renderInvoicePdf(props))
}
