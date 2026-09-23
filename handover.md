# Paperless: handover (2026-09-23)

## Snapshot

- **Project:** Paperless, a 100% free, local-first invoicing web app. It's a portfolio piece with no backend, database or auth.
- **Repo:** `C:\Users\Computer\Documents\GitHub\Paperless`, remote `https://github.com/4bdulllahh/Paperless-Web.git`, branch `main`.
- **Live site:** https://paperless-bay-zeta.vercel.app/ (Vercel Hobby tier; every push to `main` deploys automatically).
- **Last milestone:** Milestone 8 (PDF export and history), committed on `main`.
  - CI passed.
  - Live deploy verified: the QR codes scanned correctly off the live preview, with no console errors.
- **Working tree:** clean. `handover.md` is tracked; keep it Prettier-formatted or CI's `format:check` fails (it did once).
- **Checks passing:**
  - lint, format:check, typecheck and build
  - 419 tests
  - 100% coverage on `src/domain/**` and `src/storage/**`, which CI enforces
- **Main bundle:** about 138.5 KB gzipped (M8 added ~3.8 KB). The PDF engine and QR encoder are lazy chunks, loaded by the worker or a dynamic import.

## How the user works

- The user drives progress one milestone at a time with messages like "milestone 8". Don't start the next milestone without that go-ahead.
- The user granted full control: all bash commands allowed, commit and push to `main` directly.
- Commit style: `feat: <plain summary> (Milestone N)`, a body explaining the what and why, and the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- After each milestone:
  1. Run all checks, then commit and push.
  2. Wait for CI.
  3. Confirm the Vercel deploy and verify the live site in Edge.
  4. Update the README status line and roadmap tick.
  5. Give the user a plain summary covering what was built, what was verified, any bugs found and limitations. End by naming the next milestone.
- Design rules (also in memory `paperless-project-brief.md`):
  - artify360.com look with generous rounded corners
  - palette `#FFFCF2 #CCC5B9 #403D39 #252422 #EB5E28` (flame is the accent)
  - **no custom cursor**
  - **single screen**: the page never scrolls, only the inner panes do
  - must work at phone width with no sideways scroll

## Environment gotchas (Windows 11)

- **node/npm aren't on PATH in fresh shells.** Prefix PowerShell commands with:
  `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User');`
  Node is 24.19.0 at `C:\Program Files\nodejs`. The Bash tool can't find npm, so run npm in PowerShell.
- **`gh` isn't installed.** Poll CI through the public API, where `<sha>` is `git rev-parse HEAD`:
  `curl -s "https://api.github.com/repos/4bdulllahh/Paperless-Web/actions/runs?head_sha=<sha>" | grep -m2 -E '"(status|conclusion)"'`
- **Confirm a Vercel deploy** by checking that `curl -s https://paperless-bay-zeta.vercel.app/` contains the new `index-<hash>.js` name from `dist/`.
- **Browser checks** use playwright-core with the system Edge (`chromium.launch({ channel: 'msedge' })`).
  - Scripts and their `node_modules` are in `C:\Users\Computer\AppData\Local\Temp\claude\c--Users-Computer-Documents-GitHub-Paperless\b1bb66cb-2aaa-45fa-92c7-870c4290f063\scratchpad\shots\`: `m3.mjs`–`m7.mjs`, `m6perf.mjs`, `live.mjs`, `warm.mjs`.
  - Run them from that folder: `node m7.mjs <outDir> <path-to-jsQR.js>`.
  - `m7.mjs` reads `process.env.URL`, defaulting to `http://localhost:4173`.
  - If the folder is gone, reinstall with `npm i playwright-core` in a scratch folder.
- **Local production server:** `npm run build`, then `npx vite preview --port 4173 --strictPort` as a background task. Stop it afterwards with `Stop-Process` on the process listening on 4173.
- **Viewing generated PDFs:**
  1. Set `PDF_OUT=<folder>`, then run `npx vitest run src/templates` to save them.
  2. Convert pages to PNG: `python -c "import fitz; ..."` (PyMuPDF is installed).
- **Editing:**
  - Use the Edit tool for multi-line edits. Python heredoc replacements have mangled `\n` and `\s` escapes before.
  - Oxlint forbids `../` imports inside `src/domain/**`.
- **Timing:** headless Edge has a minimum width of 492px, so use playwright contexts for phone viewports (390×844). Editor collapsibles close when you switch panels, so browser scripts must reopen them.

## Architecture (current state)

- **Stack:**
  - React 19.2, Vite 8, TypeScript 6 (strict), Tailwind v4 (CSS-first `@theme` in `src/index.css`)
  - oxlint, Prettier, Vitest 5 (jsdom; `src/templates/templates.test.tsx` uses the node environment), GitHub Actions CI (`.github/workflows/ci.yml`)
- **`src/domain/`:** pure logic and Zod schemas, 100% covered.
  - `decimal.ts`, `money.ts`, `calc.ts`: exact BigInt money maths, integer minor units, tax per rate, exclusive or inclusive tax.
  - `schema.ts`: the invoice schema.
  - `records.ts`: profile, payment, logo, settings, client and history schemas, plus `emptyPaymentDetails`, `QR_METHODS`, `paymentLinkIssue`.
  - `viewModel.ts`: `buildInvoiceViewModel`, which formats everything the templates print.
  - `export.ts` (M8): `exportIssues(invoice, history)` → `{section, message}[]`, `claimsNextNumber`, `invoiceFileName`, `draftState` (draft/downloaded/edited), `findNumberClash`.
  - `history.ts` (M8): `entryStatus`, `filterHistory`, `countByFilter`, `issuedAssets`.
  - `equal.ts`: `sameData` deep equality.
  - `draft.ts` also has `duplicateInvoice`.
  - `paymentQr.ts` (M7): `paymentQr`, `invoicePaymentQr`, `upiIdIssue`, `ibanIssue`, `bicIssue`, `formatIban`, `compactIban`, `isValidIban`.
  - `numbering.ts`: `formatInvoiceNumber`, pattern `INV-{YYYY}-{####}`.
  - `draft.ts`, `lineItems.ts`, `clients.ts`, `dates.ts`, `format.ts`, `options.ts`, `decimalInput.ts`, `sample.ts`.
- **`src/storage/`:** 100% covered.
  - `persisted.ts`: `createPersistedStore(definition, initialData, actions)` provides versioned migrations, quarantine of unreadable data and `flushWrites`.
  - `backends.ts`: localStorage and IndexedDB (idb-keyval), with a memory fallback.
  - `broadcast.ts`: cross-tab sync.
  - `backup.ts`: backup export and import with migrations, plus `clearAllData`.
  - `onboarding.ts`: `finishOnboarding`, `loadSampleData`.
  - `stores.ts`:

    | Store              | Backend      | Version | Notes                                                                                                                                                                               |
    | ------------------ | ------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `useProfileStore`  | localStorage | v3      | `business`, `payment {instructions, link, qr, upiId, iban, bic}`, `onboardingComplete`                                                                                              |
    | `useLogoStore`     | IDB          |         |                                                                                                                                                                                     |
    | `useSettingsStore` | localStorage |         | Has `claimSequence()`                                                                                                                                                               |
    | `useDraftStore`    | localStorage |         | `startNewInvoice`, `duplicateIntoDraft`, `setInvoice`, `updateInvoice`, `clearDraft`                                                                                                |
    | `useClientsStore`  | IDB          |         |                                                                                                                                                                                     |
    | `useHistoryStore`  | IDB          | v2      | `{entries, logos}`; `recordInvoice(invoice, {payment, logo})`, `setStatus`, `removeEntry`; entries carry `issuedWith {payment, logoId} \| null` (null = pre-v2, print with current) |

- **`src/services/`:**
  - `pdf.ts` (lazy-loaded):
    - `renderInvoicePdf(props): Promise<Blob>` runs react-pdf in the `pdf.worker.ts` Web Worker, falling back to the main thread.
    - `rasterizePdf` uses a shared pdf.js worker.
    - `renderPreview`, `warmUp`.
  - `download.ts`: `downloadBlob(blob, fileName)`, already written and not yet used.
  - `logo.ts`.
- **`src/templates/`:**
  - `ModernTemplate`, `ClassicTemplate`, `MinimalTemplate`.
  - `shared.tsx`: `PartyBlock`, `LogoImage`, `QrCode`, `PaymentAndNotes`, `PageFooter`.
  - `layout.ts`: `TemplateProps {view, logo, payment, qr}` and the colours.
  - `props.ts`: `buildTemplateProps(invoice, logo, payment)`. Both preview and download must use it.
  - `qr.ts`: `qrMatrix`, `qrPath` (qrcode library, error correction M, vector path).
  - `fonts.ts`, `render.tsx`, `registry.ts`, `InvoiceDocument.tsx`.
- **`src/features/`:**
  - `editor/`: `EditorPane` and its sections.
  - `preview/`: `PreviewPane`, `useLivePdfPreview` (350 ms debounce).
  - `business/`: `PaymentDetailsForm` has the QR select, UPI, IBAN and BIC fields.
  - `settings/`, `clients/`, `onboarding/`.
- **`src/app/`:**
  - `AppShell.tsx`: nav rail and panels (all built; `PlaceholderPanel` was deleted). `fixIssue(section)` uses `flushSync` to show the editor, then `revealSection`.
  - `TopBar.tsx`: number, Draft/Downloaded/Edited badge and `DownloadButton`.
- **`src/features/export/`** (M8): `downloadInvoice.ts` (`downloadDraft`, `redownloadEntry`), `useDownloadInvoice`, `DownloadButton` (issues popover, done note with "Start a new invoice", error with retry).
- **`src/features/history/HistoryPanel.tsx`** (M8): search, All/Unpaid/Overdue/Paid filter, mark paid with date, download again, duplicate (asks before replacing unsaved work), delete with confirm.
- **`src/features/editor/revealSection.ts`**: section ids (`editor-section-<section>`) and `revealSection`.

## Remaining milestones

### M8: Export and history (done)

- Browser check script: `m8.mjs` in the old scratchpad `shots` folder (`node m8.mjs <outDir>`, reads `URL`). It covers the issues popover and focus, download filename and `%PDF`, the sequence 42→43, re-download without a claim, History mark paid / re-download / duplicate, the number-clash block, dark theme, and a phone viewport with no page or sideways scroll.
- Decisions: logos and payment details are snapshotted per entry, with logos deduplicated in the history store. A number used by another History entry blocks download. The claim checks the number against both the issue date and today, so moving the issue date to another year still claims.

### M9: Polish, accessibility and PWA (next)

- **Accessibility:**
  - keyboard pass: focus order, visible focus, dialogs trap focus and return it
  - `aria-live` for "Downloaded" and errors
  - check contrast in both themes
  - reduced motion
  - optionally axe-core via playwright
- **Empty, error and loading states** across the panels.
- **PWA:**
  - manifest (name, icons from the crane `public/favicon.svg` and `apple-touch-icon.png`, theme `#f2eee4`, background cream)
  - service worker precaching the app shell, fonts and PDF chunks so it works offline, e.g. `vite-plugin-pwa` (confirm it supports Vite 8) or a small hand-written SW
  - update prompt
- **Performance:** check Lighthouse; keep the main bundle around 135 KB gzipped.
- **Optional, only if asked:** non-Latin PDF fonts (Arabic and Urdu don't print yet).

### M10: Production release

- **`vercel.json` security headers:**
  - CSP: `default-src 'self'`; `script-src 'self' 'sha256-<hash of inline theme script in index.html>'`; `worker-src 'self' blob:`; `img-src 'self' data: blob:`; `font-src 'self'`; `style-src 'self' 'unsafe-inline'` (react-pdf and Tailwind need checking); `connect-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `frame-ancestors 'none'`
  - also `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`
  - verify that the preview worker, pdf.js worker, fonts, logo and blob downloads all still work under CSP
- **Cache headers** for `/assets/*` (immutable) and `/fonts/*`.
- **README:** screenshots or GIF, features, architecture, privacy statement.
- **Release:** tag `v1.0.0`, and bump `package.json` version to 1.0.0.

## Known limitations and decisions

- **PDF scripts:** the PDF fonts cover Latin scripts only; ₹, ₦ and ₨ fall back to Inter per character.
- **QR codes:**
  - They follow the UPI and EPC069-12 specs and are verified by jsQR decoding, both in unit tests and off the rendered preview locally and live. Not yet tested with a real banking or UPI app.
  - The PayPal.me amount-in-URL was deliberately left out.
- **SEPA country check:** SEPA QR doesn't restrict IBAN countries; it only needs a valid checksum and an EUR invoice.
- **Profile data:** the QR detail fields are stored as plain strings, so bad data means no QR code rather than quarantined profile data. The form commits only valid values: `CommitTextField` / `DecimalField`.
- **History preview:** the preview pane always shows the current draft, even on the History panel. Previewing a selected history entry would be a nice M9 extra.
- **History totals** show the invoice total, not the balance due.
