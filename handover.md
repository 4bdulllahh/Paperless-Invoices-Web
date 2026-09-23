# Paperless: handover (2026-09-23)

## Snapshot

- **Project:** Paperless, a 100% free, local-first invoicing web app. It's a portfolio piece with no backend, database or auth.
- **Repo:** `C:\Users\Computer\Documents\GitHub\Paperless`, remote `https://github.com/4bdulllahh/Paperless-Web.git`, branch `main`.
- **Live site:** https://paperless-bay-zeta.vercel.app/ (Vercel Hobby tier; every push to `main` deploys automatically).
- **Last milestone:** Milestone 10 (production release), tagged `v1.0.0`. All planned milestones are done.
  - CI passed.
  - Live deploy verified: the QR codes scanned correctly off the live preview, with no console errors.
- **Working tree:** clean. `handover.md` is tracked; keep it Prettier-formatted or CI's `format:check` fails (it did once).
- **Checks passing:**
  - lint, format:check, typecheck and build
  - 427 tests
  - 100% coverage on `src/domain/**` and `src/storage/**`, which CI enforces
- **Start-up JS:** about 134.4 KB gzipped (entry ~88.5 + shared `stores` chunk ~42.6 + jsx-runtime ~3.4). History, Clients, Business, Settings and the setup wizard are lazy (`src/app/lazyPanels.ts`, ~17 KB total).
- **Lighthouse (local build):** mobile 95/100/100/100 (perf/a11y/best practices/SEO after adding robots.txt), desktop 100 across the board. The PDF engine and QR encoder are lazy chunks, loaded by the worker or a dynamic import.

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

### M9: Polish, accessibility and PWA (done)

- `InlineConfirm` (`src/components/ui/InlineConfirm.tsx`) for every in-place question: focuses Cancel, Escape cancels, `returnFocus` ref gets focus back. Used in the editor, History, Clients and Settings → Data.
- Download note returns focus to the button on Escape/Close/timeout-while-focused. The Download button is no longer disabled while IDB loads (the flow already waits).
- `ErrorBoundary` around the app, with Reload and "Download a backup". Preview error now has "Try again" (`retry` from `useLivePdfPreview`). Logo field shows "Loading…" until the logo store hydrates.
- Contrast fixes found by axe: light `--accent-hover` is now `#f0733f` (lighter, 5.3:1 with ink), dark `--fg-subtle` `#a6a094`, no faded filter counts, "No logo" text `#6b665f`, skeleton marked `aria-hidden`, mobile Edit/Preview toggle inside a `<nav>`.
- PWA: `vite-plugin-pwa` 1.3 (`registerType: 'prompt'`, `injectRegister: false`), manifest and icons `public/pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png` (made with `icons.mjs` in the scratch `shots` folder). Precache is 43 files / ~5.4 MB, including the PDF engine, pdf.js worker and fonts. `src/app/UpdatePrompt.tsx` shows "works offline" once and "new version ready → Reload" (flushes IDB writes first) and checks for updates hourly. Vitest aliases `virtual:pwa-register/react` to `src/test/pwaRegister.ts`.
- Browser check: `m9.mjs <outDir> <distDir>` covers the SW, offline reload, preview, download and all panels offline, the update prompt (by appending to `dist/sw.js`), axe on every panel in both themes plus the phone layout, tab order and reduced motion. Omit `<distDir>` against the live site (see the script). axe-core and lighthouse are installed in the `shots` folder. Lighthouse runs with `CHROME_PATH` set to Edge (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`).
- M10 note: `sw.js` and `index.html` must not be cached long by Vercel (they aren't by default). Keep them `max-age=0` when adding cache headers, and add `worker-src 'self' blob:` plus the service worker to the CSP checks.

### M10: Production release (done, v1.0.0)

- `vercel.json` sets the CSP and hardening headers for every path, `immutable` caching for `/assets/*`, a week for `/fonts/*`, and `max-age=0, must-revalidate` for `sw.js`, `index.html` and the manifest. HSTS comes from Vercel itself.
- The CSP needed two exceptions, both found by running the app under it:
  - `'wasm-unsafe-eval'` plus `connect-src data:`, because react-pdf's yoga layout engine is WebAssembly embedded as a `data:` URL
  - `worker-src blob:`, because pdf.js starts `blob:` workers
- Zod runs with `z.config({ jitless: true })` (top of `src/domain/schema.ts`). Otherwise its `new Function` probe logs a CSP violation on every load. pdf.js 6 uses no eval.
- `vite preview` serves the same headers, read from `vercel.json` in `vite.config.ts`. `src/security.test.ts` checks that the inline theme script's sha256 is in the CSP, plus the other headers and cache rules. **If you edit the inline script in `index.html`, update the hash in `vercel.json`** (the test prints the problem).
- Version 1.0.0, shown in Settings through the `__APP_VERSION__` define (declared in `src/globals.d.ts`).
- README has screenshots in `docs/screenshots/*.webp`, captured with `m10shots.mjs` in the scratch `shots` folder, then resized with PIL. It also has features, privacy, security and architecture sections (a mermaid diagram).
- Browser checks: `m10csp.mjs <outDir> <logo.png>` runs under the CSP and collects violations from the page and the workers. Also run `m8.mjs` and `m9.mjs`.

### Possible next steps (only if the user asks)

- Non-Latin PDF fonts (Arabic and Urdu don't print yet).
- Previewing a History entry in the preview pane.
- Balance due (not just the total) in History.
- A custom domain, an `llms.txt`, and a real-device install test of the PWA.

## Known limitations and decisions

- **PDF scripts:** the PDF fonts cover Latin scripts only; ₹, ₦ and ₨ fall back to Inter per character.
- **QR codes:**
  - They follow the UPI and EPC069-12 specs and are verified by jsQR decoding, both in unit tests and off the rendered preview locally and live. Not yet tested with a real banking or UPI app.
  - The PayPal.me amount-in-URL was deliberately left out.
- **SEPA country check:** SEPA QR doesn't restrict IBAN countries; it only needs a valid checksum and an EUR invoice.
- **Profile data:** the QR detail fields are stored as plain strings, so bad data means no QR code rather than quarantined profile data. The form commits only valid values: `CommitTextField` / `DecimalField`.
- **History preview:** the preview pane always shows the current draft, even on the History panel. Previewing a selected history entry would be a nice M9 extra.
- **History totals** show the invoice total, not the balance due.
