import { pdf } from '@react-pdf/renderer'
import { registerPdfFonts } from './fonts'
import { InvoiceDocument } from './InvoiceDocument'
import type { TemplateProps } from './layout'

/**
 * The invoice as PDF bytes. Works both in a Web Worker (the normal path, so typing never
 * stutters) and on the main thread (the fallback).
 */
export async function renderPdfBytes(props: TemplateProps, fontBase: string): Promise<Uint8Array> {
  registerPdfFonts(fontBase)
  const blob = await pdf(<InvoiceDocument {...props} />).toBlob()
  return new Uint8Array(await blob.arrayBuffer())
}
