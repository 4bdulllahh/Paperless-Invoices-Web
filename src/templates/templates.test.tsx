// @vitest-environment node
/// <reference types="node" />
import { renderToBuffer } from '@react-pdf/renderer'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { emptyPaymentDetails, type Logo, type PaymentDetails } from '../domain/records'
import { createSampleInvoice } from '../domain/sample'
import { TEMPLATE_IDS, type Invoice, type TemplateId } from '../domain/schema'
import { registerPdfFonts } from './fonts'
import { InvoiceDocument } from './InvoiceDocument'
import { buildTemplateProps } from './props'

// Real PDF rendering (fonts, layout, compression) is slower than a unit test, especially the first.
vi.setConfig({ testTimeout: 30_000 })

/** Set PDF_OUT=<folder> to also save the generated PDFs for a visual check. */
const OUT = process.env.PDF_OUT

const payment: PaymentDetails = {
  ...emptyPaymentDetails(),
  instructions: 'Bank: Example Bank\nAccount: 0000 1234 5678',
  link: 'https://pay.example.com/acme-studio',
}

// A 2×2 transparent PNG.
const logo: Logo = {
  dataUrl:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGNgYGD4z8DAwMDAAAAHBAEAb6ZtJgAAAABJRU5ErkJggg==',
  width: 2,
  height: 2,
}

async function render(invoice: Invoice, name: string, paymentDetails = payment) {
  const buffer = await renderToBuffer(
    <InvoiceDocument {...buildTemplateProps(invoice, logo, paymentDetails)} />,
  )
  if (OUT) {
    mkdirSync(OUT, { recursive: true })
    writeFileSync(resolve(OUT, `${name}.pdf`), buffer)
  }
  const task = getDocument({ data: new Uint8Array(buffer), verbosity: 0 })
  const pdf = await task.promise
  const pages: string[] = []
  for (let n = 1; n <= pdf.numPages; n++) {
    const content = await (await pdf.getPage(n)).getTextContent()
    // pdf.js splits text into positioned pieces; rebuild lines the way a reader would.
    const lineEnd = (hasEOL: boolean) => (hasEOL ? '\n' : '')
    pages.push(
      content.items.map((item) => ('str' in item ? item.str + lineEnd(item.hasEOL) : '')).join(''),
    )
  }
  const info = (await pdf.getMetadata()).info as Record<string, string>
  const [width, height] = (await pdf.getPage(1)).view.slice(2)
  await task.destroy()
  return { pages, text: pages.join('\n'), info, width, height }
}

/** Letter-spaced and uppercase headings extract as "S C A N  T O …": compare letters only. */
const squash = (text: string) => text.replace(/\s/g, '').toLowerCase()
const expectPrinted = (text: string, expected: string) =>
  expect(squash(text), expected).toContain(squash(expected))

const longInvoice = (templateId: TemplateId) =>
  createSampleInvoice({
    templateId,
    items: Array.from({ length: 45 }, (_, i) => ({
      id: `item-${i}`,
      description: `Consulting session ${i + 1}`,
      quantity: '1',
      unitPrice: '100',
      taxRate: i % 2 ? '8.875' : '20',
      discount: { type: 'none' as const, value: '' },
    })),
  })

beforeAll(() => registerPdfFonts(resolve('public/fonts')))

describe.each(TEMPLATE_IDS)('%s template', (templateId) => {
  it('prints every part of the invoice on one A4 page', async () => {
    const { pages, text, info, width, height } = await render(
      createSampleInvoice({ templateId }),
      `${templateId}-sample`,
    )

    expect(pages).toHaveLength(1)
    expect([Math.round(width), Math.round(height)]).toEqual([595, 842]) // A4 in points
    for (const expected of [
      // The sender's name is checked via the Author metadata below: Classic prints it
      // letter-spaced, which text extraction splits into single letters.
      'INV-2026-0042',
      'Northwind Ltd',
      '400 Market Street',
      'Website design',
      '$2,400.00',
      'Subtotal',
      '-$433.50',
      'Sales tax 8.875%',
      '$346.26',
      '$3,247.76',
      'https://pay.example.com/acme-studio',
      'Thank you for your business!',
      'Page 1 of 1',
    ]) {
      expect(text).toContain(expected)
    }
    expectPrinted(text, 'Scan to pay online')
    expectPrinted(text, 'Opens pay.example.com')
    expect(info).toMatchObject({
      Title: 'Invoice INV-2026-0042',
      Author: 'Acme Studio',
      Creator: 'Paperless',
    })
  })

  it('breaks long invoices across pages without losing a line', async () => {
    const { pages, text } = await render(longInvoice(templateId), `${templateId}-long`)

    expect(pages.length).toBeGreaterThanOrEqual(2)
    for (let i = 1; i <= 45; i++) expect(text).toContain(`Consulting session ${i}`)
    // The item table header repeats on every page that has items, and totals come last.
    for (const page of pages.filter((p) => p.includes('Consulting session'))) {
      // Letter-spaced headers extract as "D E S C R I P T I O N", so ignore whitespace.
      expect(page.replace(/\s/g, '')).toMatch(/description/i)
    }
    expect(pages.at(-1)).toContain('Balance due')
    expect(pages.at(-1)).toContain(`Page ${pages.length} of ${pages.length}`)
  })

  it('prints currency symbols the display fonts lack', async () => {
    const { text } = await render(
      createSampleInvoice({ templateId, currency: 'INR', locale: 'en-IN' }),
      `${templateId}-inr`,
    )
    expect(text).toContain('₹')
  })

  it('prints a SEPA QR code on euro invoices, still on one page', async () => {
    const { pages, text } = await render(
      createSampleInvoice({ templateId, currency: 'EUR', locale: 'de-DE' }),
      `${templateId}-sepa`,
      { ...payment, qr: 'sepa', iban: 'DE89 3704 0044 0532 0130 00', bic: 'COBADEFFXXX' },
    )
    expect(pages).toHaveLength(1)
    expectPrinted(text, 'Scan to pay by bank transfer')
  })

  it('prints a UPI QR code even with no other payment details', async () => {
    const { text } = await render(
      createSampleInvoice({ templateId, currency: 'INR', locale: 'en-IN', notes: '' }),
      `${templateId}-upi`,
      { ...emptyPaymentDetails(), qr: 'upi', upiId: 'acmestudio@okhdfcbank' },
    )
    for (const expected of ['Payment', 'Scan to pay with UPI', 'To acmestudio@okhdfcbank']) {
      expectPrinted(text, expected)
    }
  })

  it('leaves the QR code off when there’s nothing to pay', async () => {
    const { text } = await render(
      createSampleInvoice({ templateId, amountPaid: '99999' }),
      `${templateId}-paid`,
    )
    expect(text).toContain('https://pay.example.com/acme-studio')
    expect(squash(text)).not.toContain('scantopay')
  })
})
