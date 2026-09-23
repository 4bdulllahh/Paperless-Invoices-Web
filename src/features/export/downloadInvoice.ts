import { todayIso } from '../../domain/dates'
import {
  claimsNextNumber,
  exportIssues,
  invoiceFileName,
  type ExportIssue,
} from '../../domain/export'
import { issuedAssets } from '../../domain/history'
import type { HistoryEntry, Logo, PaymentDetails } from '../../domain/records'
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

type Assets = { payment: PaymentDetails; logo: Logo | null }

/** Render the invoice with the same props as the preview, and save it. */
async function savePdf(invoice: Invoice, { payment, logo }: Assets): Promise<string> {
  const { renderInvoicePdf } = await import('../../services/pdf')
  const blob = await renderInvoicePdf(buildTemplateProps(invoice, logo, payment))
  const fileName = invoiceFileName(invoice)
  downloadBlob(blob, fileName)
  return fileName
}

/** History and the logo live in IndexedDB; both must be loaded before anything is decided. */
const storesReady = () => Promise.all([whenHydrated(useHistoryStore), whenHydrated(useLogoStore)])

/**
 * Download the draft as a PDF, after checking it's complete. A successful download saves a
 * snapshot to History and, on the first download, uses up the next invoice number.
 * Rejects if the PDF couldn't be made; nothing is saved then.
 */
export async function downloadDraft(today = todayIso()): Promise<DownloadResult> {
  await storesReady()
  const invoice = useDraftStore.getState().invoice
  if (!invoice) return { ok: false, issues: [] }
  const issues = exportIssues(invoice, useHistoryStore.getState().entries)
  if (issues.length > 0) return { ok: false, issues }

  const assets: Assets = {
    payment: useProfileStore.getState().payment,
    logo: useLogoStore.getState().logo,
  }
  const fileName = await savePdf(invoice, assets)

  // Decided after rendering, from what's saved now, and before this download joins History.
  const settings = useSettingsStore.getState()
  const claim = claimsNextNumber(invoice, settings, useHistoryStore.getState().entries, today)
  useHistoryStore.getState().recordInvoice(invoice, assets)
  if (claim) settings.claimSequence()
  return { ok: true, fileName }
}

/** Download a saved invoice again, exactly as it was issued. Nothing is saved or numbered. */
export async function redownloadEntry(entry: HistoryEntry): Promise<string> {
  await storesReady()
  const assets = issuedAssets(entry, useHistoryStore.getState().logos, {
    payment: useProfileStore.getState().payment,
    logo: useLogoStore.getState().logo,
  })
  return savePdf(entry.invoice, assets)
}
