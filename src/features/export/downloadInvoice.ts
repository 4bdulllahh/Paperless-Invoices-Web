import { complianceIssues } from '../../domain/compliance'
import { todayIso } from '../../domain/dates'
import {
  claimsNextNumber,
  EXPORT_SECTIONS,
  exportIssues,
  invoiceFileName,
  type ExportIssue,
} from '../../domain/export'
import { issuedAssets } from '../../domain/history'
import type { HistoryEntry, PrintAssets } from '../../domain/records'
import type { Invoice } from '../../domain/schema'
import { downloadBlob } from '../../services/download'
import { whenHydrated } from '../../storage/persisted'
import {
  useDraftStore,
  useHistoryStore,
  useLogoStore,
  useProfileStore,
  useSettingsStore,
} from '../../storage/stores'
import { buildTemplateProps } from '../../templates/props'

export type DownloadResult = { ok: true; fileName: string } | { ok: false; issues: ExportIssue[] }

/** Render the invoice with the same props as the preview, and save it. */
async function savePdf(invoice: Invoice, assets: PrintAssets): Promise<string> {
  const { renderInvoicePdf } = await import('../../services/pdf')
  const blob = await renderInvoicePdf(buildTemplateProps(invoice, assets))
  const fileName = invoiceFileName(invoice)
  downloadBlob(blob, fileName)
  return fileName
}

/** History and the images live in IndexedDB; both must be loaded before anything is decided. */
const storesReady = () => Promise.all([whenHydrated(useHistoryStore), whenHydrated(useLogoStore)])

/** What's saved now for printing a new invoice. */
function currentAssets(): PrintAssets {
  const { logo, signature, stamp } = useLogoStore.getState()
  return { payment: useProfileStore.getState().payment, logo, signature, stamp }
}

type DownloadOptions = {
  today?: string
  /** The user chose "Download anyway" past what the law in their country asks for. */
  acceptWarnings?: boolean
}

/**
 * Download the draft as a PDF, after checking it's complete. Missing legal details are
 * returned as warnings first, unless the user has accepted them. A successful download saves a
 * snapshot to History and, on the first download, uses up the next invoice number.
 * Rejects if the PDF couldn't be made; nothing is saved then.
 */
export async function downloadDraft({
  today = todayIso(),
  acceptWarnings = false,
}: DownloadOptions = {}): Promise<DownloadResult> {
  await storesReady()
  const invoice = useDraftStore.getState().invoice
  if (!invoice) return { ok: false, issues: [] }
  const required = exportIssues(invoice, useHistoryStore.getState().entries)
  const legal = acceptWarnings ? [] : complianceIssues(invoice)
  if (required.length > 0 || legal.length > 0) {
    // In editor order, what must be fixed before what's advised within each section.
    const order = (issue: ExportIssue) => EXPORT_SECTIONS.indexOf(issue.section)
    return { ok: false, issues: [...required, ...legal].sort((a, b) => order(a) - order(b)) }
  }

  const assets = currentAssets()
  // Printed with its own payment details if they were changed on the invoice; saved that way.
  const printed: PrintAssets = { ...assets, payment: invoice.payment ?? assets.payment }
  const fileName = await savePdf(invoice, printed)

  // Decided after rendering, from what's saved now, and before this download joins History.
  const settings = useSettingsStore.getState()
  const claim = claimsNextNumber(invoice, settings, useHistoryStore.getState().entries, today)
  useHistoryStore.getState().recordInvoice(invoice, invoice.signed ? printed : noSignature(printed))
  if (claim) settings.claimSequence()
  return { ok: true, fileName }
}

/** Unsigned invoices don't keep the signature and stamp they didn't print. */
const noSignature = (assets: PrintAssets): PrintAssets => ({
  ...assets,
  signature: null,
  stamp: null,
})

/** Download a saved invoice again, exactly as it was issued. Nothing is saved or numbered. */
export async function redownloadEntry(entry: HistoryEntry): Promise<string> {
  await storesReady()
  const assets = issuedAssets(entry, useHistoryStore.getState().logos, currentAssets())
  return savePdf(entry.invoice, assets)
}
