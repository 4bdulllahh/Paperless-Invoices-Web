/**
 * Builds invoice PDFs off the main thread. react-pdf's layout takes a few hundred milliseconds;
 * here that time never blocks typing in the editor.
 */
import type { TemplateProps } from '../templates/layout'
import { renderPdfBytes } from '../templates/render'

export type PdfRequest = { id: number; props: TemplateProps; fontBase: string }
export type PdfResponse = { id: number; bytes: Uint8Array } | { id: number; error: string }

// The app's TypeScript config targets the DOM; describe just the worker API used here.
const scope = self as unknown as {
  addEventListener(type: 'message', listener: (event: MessageEvent<PdfRequest>) => void): void
  postMessage(message: PdfResponse, transfer?: Transferable[]): void
}

scope.addEventListener('message', async ({ data: { id, props, fontBase } }) => {
  try {
    const bytes = await renderPdfBytes(props, fontBase)
    scope.postMessage({ id, bytes }, [bytes.buffer])
  } catch (error) {
    scope.postMessage({ id, error: error instanceof Error ? error.message : String(error) })
  }
})
