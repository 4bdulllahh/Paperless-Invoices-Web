# Paperless: handover

This file is for whoever picks up Paperless next, most likely a new Claude session with no memory of earlier work. The user will come back with feedback from people who tried the app. This file should be enough to understand the app, make the changes and ship them safely.

Read it all once before changing anything. Keep it up to date as the last step of every change: update [Current state](#current-state) and anything that stopped being true.

## Contents

1. [What Paperless is](#what-paperless-is)
2. [Working with the user](#working-with-the-user)
3. [Starting a session](#starting-a-session)
4. [The app as a user sees it](#the-app-as-a-user-sees-it)
5. [How the code is organised](#how-the-code-is-organised)
6. [How data flows](#how-data-flows)
7. [Saved data and storage](#saved-data-and-storage)
8. [Where to make common changes](#where-to-make-common-changes)
9. [Rules that must not break](#rules-that-must-not-break)
10. [Checking your work](#checking-your-work)
11. [Shipping a change](#shipping-a-change)
12. [Windows environment notes](#windows-environment-notes)
13. [Known limitations and ideas](#known-limitations-and-ideas)
14. [Current state](#current-state)

## What Paperless is

Paperless is a free invoice generator that runs entirely in the browser. It's a portfolio piece.

- **No backend:** no server, database, accounts or analytics. Everything is saved on the user's device, in localStorage and IndexedDB.
- **Output:** a real A4 PDF, generated in the browser. The preview shows that same PDF drawn as an image, so the preview and the download can't differ.
- **Offline:** a service worker keeps a copy of the app. It's a website, not an installable app, and it has no web app manifest on purpose. The user said a phone app may come later, as a separate project.

| What        | Where                                                                     |
| ----------- | ------------------------------------------------------------------------- |
| Repo        | `C:\Users\Computer\Documents\GitHub\Paperless`, branch `main`             |
| Remote      | https://github.com/4bdulllahh/Paperless-Invoices-Web                      |
| Live site   | https://paperless-bay-zeta.vercel.app/                                    |
| Hosting     | Vercel Hobby. Every push to `main` deploys automatically.                 |
| CI          | GitHub Actions, `.github/workflows/ci.yml`. Runs on every push to `main`. |
| Public docs | `README.md`: features, architecture, privacy, security and the roadmap.   |

## Working with the user

- **Permissions:** the user has given full control. You can run any command and commit and push straight to `main`. There are no pull requests.
- **Feedback:** the user writes one message listing several changes, often informally. Treat each item as a requirement. When an item is unclear, look at any screenshot and pick the sensible reading. Say which reading you chose in the summary rather than stopping to ask.
- **Finish the work:** implement everything, verify it, ship it and report. Don't stop half way to ask for approval.
- **Commit message:**
  - Subject: `feat: <plain summary>` or `fix: <plain summary>`. Put the version in brackets for releases, e.g. `(v1.2.0)`.
  - Body: what changed and why.
  - Trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (or whatever attribution line the session's system reminder gives).
- **The final message:** a plain summary for the user covering what changed (one line per request), what was verified on the live site, and limitations or things they need to do. The user isn't interested in code details.
- **Design rules.** The user set these and cares about them:
  - The look follows artify360.com: soft, generously rounded cards and controls.
  - Palette: `#FFFCF2` cream, `#CCC5B9` sand, `#403D39` olive, `#252422` ink, `#EB5E28` flame (the accent). Tokens are in `src/index.css`.
  - **No custom cursor.**
  - **Single screen:** the page itself never scrolls. Only panes inside it scroll (the editor, the preview, panels).
  - **Phone width works:** 390 px wide with no sideways scrolling. Below the `lg` breakpoint, the layout switches to an Edit/Preview toggle and a bottom tab bar.
  - UI text is plain, friendly English with curly quotes and apostrophes (’ “ ”).

## Starting a session

1. Read this file, then skim `README.md`.
2. `git pull` and `git log --oneline -10` to see if anything changed since this file was written.
3. In PowerShell, fix PATH, then install and check (see [Windows environment notes](#windows-environment-notes)):
   ```powershell
   $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
   npm ci
   npm run check        # lint, format check, typecheck, tests
   ```
4. `npm run dev` for development (http://localhost:5173). The dev server doesn't send the security headers. To test the real policy, use a production build (see [Checking your work](#checking-your-work)).
5. Open the app, click "Explore with sample data" in the setup wizard, and look at what the feedback is about before touching code.

## The app as a user sees it

**First visit.** A setup wizard (`src/features/onboarding/OnboardingWizard.tsx`) covers the whole screen. Its four steps:

1. **Country (required):** pre-selected from the device's time zone (then its languages) by `guessCountry`. Fills in currency, number format, tax name and rate, tax number label, title, amount in words, tax on each line and signing.
2. **Business details:** name and email are required.
3. **Invoice defaults:** payment terms, numbering and so on.
4. **Getting paid:** payment instructions, accepted methods and QR code.

"Explore with sample data" skips the wizard and loads a demo business, client and invoice (`src/domain/sample.ts`). After setup, the first invoice is empty apart from the user's defaults.

**The workspace** (`src/app/AppShell.tsx`):

- **Top bar** (`TopBar.tsx`): brand (the page's `h1`), invoice number, a Draft/Downloaded/Edited badge, theme toggle and **Download PDF**.
- **Nav rail** (desktop) or bottom tab bar (phone): Invoice, History, Clients, Business, Settings (`navigation.ts`).
- **Main area:** on desktop, the current panel sits on the left and the live preview is always on the right. On a phone, Invoice has an Edit/Preview toggle and the other panels hide the preview.

**Invoice sections, as of v1.2:**

- **Items:** each line has Qty, Unit (with suggestions: Pcs, Sets, Hrs…), Unit price and Tax %. India adds an HSN/SAC field. With "tax on each line", each line also shows its tax and total.
- **Tax & discounts:** tax name, "Show VAT on each line", a price box ("Include VAT in AED 100.00" and "Grand total you want" plus Fit rates, both undoable), the invoice discount and "Advance payments" (the `amountPaid` field).
- **Title, number & dates:** title, number, issue date, date of supply, a Due date / Payment terms toggle (terms: on delivery, 15–90 days; the due date is still stored so History knows when it's overdue), LPO/PO number and currency.
- **From:** the sender, the TRN (or local label) with a format check, and "Sign this invoice" with the signature and stamp.
- **Payment:** the same form as Business, but changes are saved on the invoice itself (`invoice.payment`), with a notice. "Use my defaults" clears them; new and duplicated invoices start from the defaults.

**Panels:**

| Panel    | File                                      | What it does                                                                                                                                                                                                                                    |
| -------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invoice  | `src/features/editor/EditorPane.tsx`      | Collapsible sections in this order: Bill to (with saved-client combobox), Items, Tax & discounts, Title, number & dates, From, Payment, Notes. A totals footer shows the balance due, with an expandable breakdown. Every keystroke autosaves.  |
| History  | `src/features/history/HistoryPanel.tsx`   | Every downloaded invoice. Search, filter (All/Unpaid/Overdue/Paid), mark paid with a date, download again exactly as issued, duplicate as a new draft, delete.                                                                                  |
| Clients  | `src/features/clients/ClientsPanel.tsx`   | Saved "Bill to" details, added with "Save to clients" in the editor. Search, put one on the current invoice, delete.                                                                                                                            |
| Business | `src/features/business/BusinessPanel.tsx` | Business details, logo, default payment details (accepted methods, bank name, account name and number, IBAN, SWIFT, other instructions, payment link, QR code of type link, UPI or SEPA), and the signature and stamp with "Sign new invoices". |
| Settings | `src/features/settings/SettingsPanel.tsx` | Country, currency, locale, tax, terms, numbering, title, template and words (`InvoiceDefaultsForm.tsx`). Also data (backup export/import, erase everything; `DataSection.tsx`), "Run setup again", and the version plus GitHub link.            |

**Preview pane** (`src/features/preview/PreviewPane.tsx`):

- a template dropdown with six templates
- the page image(s)
- a floating zoom bar: out, a % label that resets to fit width, in, and fit page/fit width
- Ctrl/⌘ + wheel and pinch also zoom (`usePreviewZoom.ts`)

**Download.** Clicking Download PDF runs these checks first (`src/domain/export.ts` → `exportIssues`):

- a client name
- at least one item with a description and price
- an invoice number not already used by another History entry
- a sender name

Then `complianceIssues` (`src/domain/compliance.ts`) lists what the law in the invoice's country asks for, as warnings (`legal: true`). Examples: the seller's TRN, the client's address and TRN, the title "Tax Invoice", VAT in AED, HSN/SAC codes and a signature in India.

Any problems appear in a popover, each with a button that jumps to the section to fix. When only warnings remain, the popover is titled "Missing for a legal invoice" and offers **Download anyway**. A successful download saves a snapshot to History. The first download of a draft also uses up the next invoice number. A "Start a new invoice" note follows.

**Other UI:**

- `StorageIssueBanner`: storage full, blocked or data unreadable.
- `UpdatePrompt`: a one-time "works offline" note, and "New version ready → Reload".
- `ErrorBoundary`: a crash screen with Reload and "Download a backup".

## How the code is organised

- **Stack:**
  - React 19, Vite 8 and TypeScript 6 (strict)
  - Tailwind CSS v4, configured in CSS (`@theme` in `src/index.css`, no tailwind config file)
  - Zustand stores validated by Zod 4
  - @react-pdf/renderer for PDFs and pdf.js (`pdfjs-dist`) for drawing them
  - vite-plugin-pwa (Workbox) for offline
  - Vitest with jsdom and Testing Library for tests; oxlint and Prettier for lint and format
- **Node:** 24 (`.nvmrc`).

```
src/
  domain/       Pure TypeScript: schemas, money maths, formatting, rules. No React, no storage.
  storage/      Persisted Zustand stores, backends, migrations, backup, cross-tab sync.
  templates/    The six PDF templates (react-pdf components) and what they share.
  services/     pdf.ts (PDF + rasterise, lazy), pdf.worker.ts, download.ts, logo.ts.
  features/     UI by area: editor, preview, export, history, clients, business, settings, onboarding.
  components/   ui/ (Button, Card, Field, Checkbox, Collapsible, SegmentedControl, InlineConfirm…) and brand/.
  app/          AppShell, TopBar, NavRail, lazy panels, error boundary, update prompt, storage banner.
  hooks/        useTheme, useHydrated, useStorageIssue.
  lib/          cn (clsx + tailwind-merge), formatBytes.
  test/         Vitest setup, the PWA register stub.
  security.test.ts  Checks vercel.json headers against index.html.
```

**`src/domain/`** is where most feedback lands. It's all pure functions, it must stay at 100% test coverage (CI enforces this), and oxlint forbids `../` imports inside it.

| File                                                                     | Holds                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema.ts`                                                              | The invoice schema (`invoiceSchema`, `Party`, `LineItem`), `TEMPLATE_IDS`, the decimal-string validators, and the payment details schema (moved here in 1.2 because invoices can carry their own; `records.ts` re-exports it). Also sets `z.config({ jitless: true })` at the top; see the rules. |
| `records.ts`                                                             | Everything else that's saved: business profile, payment details (`PAYMENT_METHODS`, `QR_METHODS`), logo, settings, client and history entry.                                                                                                                                                      |
| `decimal.ts`, `money.ts`, `calc.ts`                                      | Exact BigInt maths on integer minor units (cents, fils…). `calculateTotals` handles line discounts, invoice discount, tax per rate, exclusive or inclusive tax and amount paid. Never use floats for money.                                                                                       |
| `viewModel.ts`                                                           | `buildInvoiceViewModel(invoice)`: every string a template prints, already formatted (money, dates, tax rows, title, total in words). Templates never calculate.                                                                                                                                   |
| `draft.ts`                                                               | `createInvoiceDraft`, `followDefaults` (the draft follows Settings changes), `duplicateInvoice`, `isPristineDraft`.                                                                                                                                                                               |
| `countries.ts`                                                           | 63 country presets, `countrySettings(preset)` → Settings patch, `guessCountry` and `countryInSentence` ("the United Arab Emirates").                                                                                                                                                              |
| `compliance.ts`                                                          | What each country's law asks an invoice to show (`RULES`), tax number formats (`taxIdIssue`, `taxIdRules`) and `complianceIssues`, the warnings shown before downloading. Sources are listed at the top.                                                                                          |
| `pricing.ts`                                                             | `fitToTotal` and `includeTaxInPrices`: work unit prices back from a grand total. Scales, nudges, then searches small changes on the finest lines for an exact total.                                                                                                                              |
| `words.ts`                                                               | `numberToWords` and `amountInWords` (unit names for 37 currencies; lakh/crore; "only").                                                                                                                                                                                                           |
| `export.ts`                                                              | `exportIssues`, `claimsNextNumber`, `invoiceFileName`, `draftState`, `findNumberClash`.                                                                                                                                                                                                           |
| `history.ts`                                                             | `entryStatus` (overdue is computed), `filterHistory`, `countByFilter`, `issuedAssets`.                                                                                                                                                                                                            |
| `paymentQr.ts`                                                           | UPI and SEPA (EPC069-12) QR payloads, IBAN/BIC/UPI validation.                                                                                                                                                                                                                                    |
| `numbering.ts`                                                           | Number patterns like `INV-{YYYY}-{####}`.                                                                                                                                                                                                                                                         |
| `options.ts`                                                             | Dropdown options: currencies, locales, `TEMPLATE_OPTIONS` (name and description), payment terms.                                                                                                                                                                                                  |
| `format.ts`, `dates.ts`                                                  | Intl formatting and ISO date helpers.                                                                                                                                                                                                                                                             |
| `lineItems.ts`, `clients.ts`, `decimalInput.ts`, `equal.ts`, `sample.ts` | Smaller helpers and the sample data.                                                                                                                                                                                                                                                              |

## How data flows

**Editing and preview:**

```
Editor field ──update()──▶ useDraftStore (autosaved to localStorage)
                                │
            useLivePdfPreview (350 ms debounce; waits for the logo to load)
                                │
     buildTemplateProps(invoice, { payment, logo, signature, stamp })   ← templates/props.ts
        = buildInvoiceViewModel + payment QR; invoice.payment ?? the default payment
                                │
     services/pdf.ts (lazy import) → pdf.worker.ts → react-pdf → PDF bytes
                                │
     pdf.js worker rasterises each page to PNG at `resolution` px (1240, more when zoomed)
                                │
     <img> pages in PreviewPane
```

**Download** (`src/features/export/downloadInvoice.ts` → `downloadDraft`):

1. Wait for History and the logo to load from IndexedDB.
2. Run `exportIssues`, and stop if there are any.
3. Render with **the same `buildTemplateProps`** as the preview, then save the file as `Invoice <number> - <client>.pdf`.
4. `claimsNextNumber` decides whether this draft uses up the sequence.
5. `recordInvoice` saves a snapshot with the payment details, logo, signature and stamp it was printed with. `redownloadEntry` uses that snapshot later, so re-downloads never change.

**Settings changes reach the open draft.** `updateSettings` in `stores.ts` runs `followDefaults`: any draft field still equal to the old default takes the new one, and fields edited on the invoice itself stay put. Drafts already in History are left alone. This is what made the footer currency follow Settings in v1.1. If you add a setting that has a matching invoice field, add it to `followDefaults` too.

Business details follow the same pattern: `updateBusiness` updates the draft's `from` while it still matches the old profile.

## Saved data and storage

All stores are created by `createPersistedStore` (`src/storage/persisted.ts`). It adds:

- **Validation:** every load is checked against the store's Zod schema.
- **Versions:** a version number and `migrations[n]`, which upgrades data from version n−1 to n.
- **Quarantine:** unreadable data is kept under `<key>:quarantine:<time>` and never deleted. The user sees a banner.
- **Cross-tab sync:** over a BroadcastChannel (`broadcast.ts`).
- **Helpers:** `whenHydrated(store)` and `flushWrites()`, which waits for IndexedDB writes.

| Store (`src/storage/stores.ts`) | Key                  | Backend      | Version | Contents                                                                                  |
| ------------------------------- | -------------------- | ------------ | ------- | ----------------------------------------------------------------------------------------- |
| `useProfileStore`               | `paperless:profile`  | localStorage | 3       | `business` (Party), `payment` (PaymentDetails), `onboardingComplete`                      |
| `useLogoStore`                  | `paperless:logo`     | IndexedDB    | 1       | `logo`, `signature`, `stamp` (PNG/JPEG data URL and size) or null                         |
| `useSettingsStore`              | `paperless:settings` | localStorage | 2       | Defaults for new invoices, `country`, `nextSequence`                                      |
| `useDraftStore`                 | `paperless:draft`    | localStorage | 2       | `invoice`, the one being edited                                                           |
| `useClientsStore`               | `paperless:clients`  | IndexedDB    | 1       | `clients[]`                                                                               |
| `useHistoryStore`               | `paperless:history`  | IndexedDB    | 2       | `entries[]` (invoice snapshot, `issuedWith`, status, paidAt) and `logos{}` (deduplicated) |

The theme is stored separately at `paperless:theme` (`useTheme.ts`, mirrored in the inline script in `index.html`). The preview zoom is at `paperless:preview-zoom`.

**Changing what's saved:**

- **Adding a field:** give it a Zod `.default(...)` in the schema. Old saved data and old backups then load without a migration. v1.1 added `title`, `taxIdLabel`, `amountInWords`, `country`, `documentTitle`, `payment.methods` and others this way. v1.2 added `poNumber`, `supplyDate`, `dueMode`, `paymentTermsDays`, `payment`, `signed`, `showLineTax` and `country` on the invoice, `unit` and `code` on lines, bank fields on payment details, and signature/stamp ids on History entries. Their defaults keep older invoices printing as they did (for example `showLineTax: false` keeps the old tax rounding).
- **v1.2 migrations:** settings and draft went to version 2 to change a saved title of "Tax invoice" to "Tax Invoice".
- **Renaming, removing or restructuring:** bump the store's `version` and add `migrations[newVersion]`, then add a test in `src/storage/stores.test.ts`.
- **Backups:** backup files (`backup.ts`) include each store's version and are migrated on import. A change that loads old data correctly also loads old backups.
- **Checking the schema:** users have real data on their devices. Never make the schema stricter without checking that old data still parses.

## Where to make common changes

**Add a field to the invoice:**

1. Add it to `invoiceSchema` in `domain/schema.ts` with a `.default()`.
2. If it has a default in Settings, also add it to `settingsSchema` in `records.ts`, to `initialSettings` in `stores.ts`, to `createInvoiceDraft` and `followDefaults` in `draft.ts`, and to `InvoiceDefaultsForm.tsx`.
3. Add the editor field in the right section under `features/editor/sections/`.
4. Expose it through `viewModel.ts` if it prints, then use it in the templates. Update `sample.ts` if the demo should show it.
5. Add tests in `schema.test.ts`, `draft.test.ts` and `viewModel.test.ts`. Coverage must stay at 100%.

**Add or change a template:**

1. Create `src/templates/<Name>Template.tsx`, starting by copying the closest existing one.
2. Use the shared pieces in `shared.tsx`: `PartyBlock`, `LogoImage`, `QrCode`, `PaymentAndNotes`, `TotalInWords`, `PageFooter`. Use the column helpers and colours in `layout.ts`.
3. Register it:
   - add its id to `TEMPLATE_IDS` in `schema.ts`
   - add one line to `TEMPLATES` in `registry.ts`
   - add a name and description to `TEMPLATE_OPTIONS` in `options.ts`
4. `src/templates/templates.test.tsx` renders every template, including long and edge-case invoices. Run it with `PDF_OUT` to look at the results (see [Checking your work](#checking-your-work)).
5. react-pdf isn't the browser: it uses flexbox only and a limited set of CSS. It has no fonts other than the registered ones (`fonts.ts`). Check long names, many items (page breaks), no logo, a QR code, inclusive tax and amount in words.

**Fix or add a country:** edit `ROWS` in `domain/countries.ts`. Use the `EU(...)` helper or the `GULF` / `GULF_VAT` extras where they fit. The legal checks live in `RULES` in `domain/compliance.ts`: what's required (seller and buyer tax numbers, addresses, title, tax currency, signature, item codes) and the tax number's format.

- The `locale` must be an English variant (`en-AE`, `en-150`, …). `countries.test.ts` fails if money or dates would print characters the PDF fonts lack.
- Use `note` for legal warnings, e.g. mandatory e-invoicing.
- Rates are strings, such as `'20'` or `'8.875'`, or `''` for none or regional rates.
- The country picker is `features/settings/CountryField.tsx`.

**Amount in words:**

- Add currency unit names to `CURRENCY_UNITS` in `domain/words.ts`. Currencies not listed fall back to Intl's English name plus a fraction.
- Lakh/crore counting is set by `SOUTH_ASIAN_CURRENCIES`.
- Currencies ending in "only" are set by `ONLY_CURRENCIES`.

**Tax and totals:**

- The rules are in `domain/calc.ts`; the tests in `calc.test.ts` are the spec. `showLineTax` switches tax rounding from per rate to per line.
- "Tax included" and "Grand total you want" are in `domain/pricing.ts`. The editor always enters prices before tax now; `taxMode: 'inclusive'` only survives on older invoices, and the Tax section offers to convert them.
- The README section "How totals are calculated" describes the rounding rules. Keep it in sync.

**Payment:**

- Methods (bank, card, cash, cheque) are set by `PAYMENT_METHODS` and `PAYMENT_METHOD_LABELS` in `records.ts`.
- The form is `features/business/PaymentDetailsForm.tsx`. It's controlled: `DefaultPaymentDetailsForm` edits the profile, and the editor's `PaymentSection` edits `invoice.payment`.
- What prints is set by `PaymentAndNotes` in `templates/shared.tsx`.
- QR codes are made in `domain/paymentQr.ts` and drawn by `templates/qr.ts`.

**Editor layout and sections:**

- The sections are in `features/editor/sections/`.
- Section ids used by the "fix this" buttons are in `revealSection.ts`, as `editor-section-<name>`.
- Field components: `TextField`, `TextAreaField` and `SelectField` (`Field.tsx`); `DecimalField` and `CommitTextField` only save valid values; `CheckboxField` and `ChoiceChips`.
- Ask before destructive actions with `InlineConfirm`.

**Colours, spacing, fonts:**

- Design tokens (`--canvas`, `--surface`, `--fg`, `--accent`…) are in `src/index.css`, for light and dark (`[data-theme="dark"]`).
- Use the token classes (`bg-surface`, `text-fg-subtle`, `rounded-lg`…), not raw hex values, in components.
- The PDF has its own print colours, in `templates/layout.ts`.

**Add a panel:** add an id to `PanelId` and `NAV_ITEMS` (`app/navigation.ts`), a lazy import in `app/lazyPanels.ts`, and a branch in `AppShell.tsx`.

**Content Security Policy and headers:**

- These live in `vercel.json`. `vite preview` reuses them.
- If you edit the inline theme script in `index.html`, its sha256 in the CSP must change too. `src/security.test.ts` fails and prints the new hash.
- If you add something that loads from another origin, a worker type or eval, update the CSP and test it under `vite preview`.

**Text in the README:** the Features, Roadmap and screenshots sections describe the app. Update them when a change is visible to users.

## Rules that must not break

**Numbers and money:**

- **Preview and download share `buildTemplateProps`.** Never build template props any other way.
- **Money is exact.** Money is stored as decimal strings and calculated in BigInt minor units. Floats are only used for display (zoom, layout).
- **An invoice number is used up only on the first successful download** (`claimsNextNumber`). Abandoned drafts don't waste numbers.
- **History snapshots never change on re-download.** They print with their own saved payment details and logo (`issuedWith`). Entries saved before v2 have `issuedWith: null` and use the current ones.

**PDF output:**

- **PDF fonts are Latin only:** Inter, Space Grotesk and Libre Baskerville, in `public/fonts`. Inter fills missing currency symbols. Arabic, Urdu, Chinese and similar scripts print as empty boxes. That's why country locales are English variants.

**Security policy:**

- **The CSP has no `unsafe-eval`, and it must stay that way.** Zod runs `jitless`; pdf.js 6 uses no eval.
- **The known exceptions are required:** `'wasm-unsafe-eval'` and `connect-src data:` (react-pdf's yoga layout engine is WebAssembly in a data: URL), and `worker-src blob:` (pdf.js).
- **`sw.js` and `index.html` must never be cached long** (`vercel.json` sets `max-age=0`), or users get stuck on old versions.

**Offline and PWA:**

- **No web app manifest** (`manifest: false` in `vite.config.ts`). The user doesn't want an installable app window.
- **Updates wait for the user to click Reload**, so a form is never swapped out mid-edit (`registerType: 'prompt'`).

**Layout:**

- **Single screen, phone width, no custom cursor.** See the design rules above.

**Code and CI:**

- **Keep domain and storage at 100% coverage.** CI runs `npm run test:coverage` with thresholds.
- **Visually hidden inputs need a positioned parent.** An `sr-only` input inside a scrolling pane, with no `relative` ancestor, escapes the pane and makes the whole page scroll (v1.2 found this with the payment method chips on phones).
- **Keep this file Prettier-formatted.** CI's `format:check` includes `handover.md`. Run `npx prettier --write handover.md`.
- **Start-up JavaScript stays small** (about 134 KB gzipped). Heavy code (the PDF engine, pdf.js, QR, the non-editor panels) is loaded on demand. Don't import `services/pdf.ts` or `templates/*` statically from app code; use `import()`.

## Checking your work

**Checks to run before every push** (the same as CI):

```powershell
npm run lint; npm run format:check; npm run typecheck; npm run test:coverage; npm run build
```

`npm run check` runs the first four without coverage. `npm run format` fixes formatting.

**Test layout:**

- Test files sit next to the code (`*.test.ts`/`*.test.tsx`).
- UI tests use Testing Library in jsdom. jsdom has no `ResizeObserver`, `scrollTo` or real layout, so code guards those calls.
- `src/templates/templates.test.tsx` runs in Node and renders real PDFs.
- `src/test/pwaRegister.ts` stubs the service-worker register module.

**Look at the PDFs** without the browser:

```powershell
$env:PDF_OUT = "$env:TEMP\paperless-pdfs"; npx vitest run src/templates; Remove-Item Env:PDF_OUT
```

To view them as images, convert with PyMuPDF (installed):

```bash
python -c "import fitz,glob; [fitz.open(f)[0].get_pixmap(dpi=110).save(f[:-4]+'.png') for f in glob.glob(r'<folder>/*.pdf')]"
```

Then open the PNGs with the Read tool.

**Test the production build locally** under the real CSP:

```powershell
npm run build
npx vite preview --port 4173 --strictPort   # run as a background task
```

Afterwards, stop it with `Get-NetTCPConnection -LocalPort 4173 | ForEach-Object { Stop-Process -Id $_.OwningProcess }`.

**Browser checks** use playwright-core driving the system Edge (`chromium.launch({ channel: 'msedge' })`).

- **Where they are:** scripts written in earlier sessions live in the scratch folder `C:\Users\Computer\AppData\Local\Temp\claude\c--Users-Computer-Documents-GitHub-Paperless\b1bb66cb-2aaa-45fa-92c7-870c4290f063\scratchpad\shots\`, together with `node_modules` for playwright-core, axe-core and lighthouse.
- **How to run:** run them from that folder. Each reads `URL` (default `http://localhost:4173`); set `URL=https://paperless-bay-zeta.vercel.app/` to check the live site.
- **Scripts:**

  | Script                           | What it checks                                                                                                                                                                                                                                                                                                                   |
  | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `m12.mjs <outDir>`               | The v1.2 regression and the best starting point: a first run in Dubai (country guessed), TRN checks, VAT on each line, tax included and grand total, LPO and terms, payment changed on one invoice, a drawn signature, the legal warnings and Download anyway, phone layout, axe in both themes. Prints `errors: []` when clean. |
  | `m11.mjs <outDir>`               | The v1.1 regression: first run with a country, currency following Settings, zoom, all six templates, download, phone layout, and axe accessibility scans. Pins a time zone with no preset, so the country starts empty.                                                                                                          |
  | `m10csp.mjs <outDir> <logo.png>` | Runs the app under the real CSP (no bypass) and collects every violation from the page and workers: preview, logo, download, backup export, service worker. Any PNG works as the logo, e.g. `public/apple-touch-icon.png`.                                                                                                       |
  | `m8.mjs <outDir>`                | Download flow and History.                                                                                                                                                                                                                                                                                                       |
  | `m9.mjs <outDir> [distDir]`      | Offline, update prompt, axe on every panel in both themes, tab order.                                                                                                                                                                                                                                                            |
  | `m10shots.mjs <outDir>`          | Captures the README screenshots. Convert them to `docs/screenshots/*.webp` with PIL at about 1600 px wide.                                                                                                                                                                                                                       |

- **If that folder is gone** (Temp gets cleaned): make a new scratch folder, run `npm i playwright-core axe-core`, and write a fresh script modelled on the m11 description above.
  - Use `browser.newContext({ viewport, isMobile, hasTouch })` for phone sizes, since headless Edge windows can't go below 492 px.
  - Use `bypassCSP: true` only in contexts where axe gets injected.
- **Gotchas:** editor sections collapse when you switch panels, so scripts must reopen them. The one-time "works offline" note can cover things for a few seconds after the first load.

**Accessibility:**

- Every panel is scanned with axe in both themes. Keep it at zero violations.
- Watch contrast: `opacity-*` on text counts, and `--accent-hover` was lightened for this reason.
- Every scrollable region needs to be focusable.

**Lighthouse (optional):** run from the scratch folder with `CHROME_PATH` set to `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`. The last scores were mobile 95/100/100/100 and desktop 100 across the board.

## Shipping a change

1. Run all checks (above) and fix everything. Run the browser checks relevant to what changed, locally against `vite preview`.
2. For a user-visible release:
   - bump `version` in `package.json` and run `npm install --package-lock-only` so the lockfile matches
   - update the README (Features, Roadmap line, screenshots if the look changed)
   - update this file
   - the version appears in Settings through `__APP_VERSION__`
3. Commit and push to `main`. Commit from Bash, because PowerShell mangles quotes in multi-line messages:
   ```bash
   git add -A && git commit -F- <<'EOF'
   feat: <summary> (v1.x.0)

   <body>

   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   EOF
   git push origin main
   ```
4. Wait for CI. The `gh` CLI isn't installed, so use the public API:
   ```bash
   curl -s "https://api.github.com/repos/4bdulllahh/Paperless-Invoices-Web/actions/runs?head_sha=$(git rev-parse HEAD)" | grep -m2 -E '"(status|conclusion)"'
   ```
5. Wait for Vercel. The deploy is live when `curl -s https://paperless-bay-zeta.vercel.app/` contains the new `index-<hash>.js` name from `dist/assets`.
6. Run `m11.mjs` and `m10csp.mjs` against the live URL.
7. Tag releases: `git tag -a v1.x.0 -m "..." && git push origin v1.x.0`.
8. Write the plain summary for the user.

Versioning: bug fixes bump the patch (1.1.1). A round of feature feedback bumps the minor version (1.2.0).

## Windows environment notes

- **Machine:** Windows 11. Node 24 is at `C:\Program Files\nodejs`.
- **PATH:** fresh PowerShell shells don't have node or npm on PATH. Start npm commands with the `$env:Path = ...` line from [Starting a session](#starting-a-session). The Bash tool (Git Bash) can't find npm, so run npm and npx in PowerShell. git, curl and python work in Bash.
- **PowerShell 5.1:** it has no `&&`. Use `;` or `if ($?) { … }`.
- **Editing files:** use the Edit tool for multi-line code edits. Python heredoc replacements have mangled `\n` escapes in the past.
- **Line endings:** `.gitattributes` normalises them. Don't be alarmed by CRLF warnings.

## Known limitations and ideas

**Limitations the user knows about:**

- **Tax data:** the 63 country presets use 2026 standard rates. Reduced rates, US state sales tax and similar are left for the user to enter. Some countries require e-invoicing through government systems, and their notes say so. Paperless can't submit e-invoices.
- **UAE e-invoicing:** mandatory through an accredited provider from 1 January 2027 (revenue of AED 50 million or more) and 1 July 2027 (everyone else). PDF tax invoices are fine until then. The AE country note says so.
- **Legal checks** cover the fields each country's VAT law lists. They can't know whether a client is VAT-registered, so a missing client TRN is a warning, not a block. India's CGST/SGST/IGST split and place of supply aren't modelled.
- **Exact grand totals:** with large quantities, a 0.01 change in a rate moves the total by a lot, so some totals can't be reached with 2-decimal rates. Paperless picks the closest and says so, and may move a rate or two a few fils off the even proportion to reach an exact total.
- **Grouped items:** headings between groups of lines (like "Maintenance Staff" on the user's sample) aren't supported yet.
- **Logo picker on Android:** "Can't load some photos" comes from Google Photos' cloud picker. On phones there's also a "From Files" button, which opens the file browser instead.
- **Scripts:** PDFs print Latin scripts only (see above).
- **QR codes:** they follow the UPI and EPC specs and decode with jsQR in tests and off the live preview. They haven't been tested with a real banking app.
- **Previewing History:** the preview always shows the current draft, even on the History panel.
- **History totals:** History shows the invoice total, not the balance due after amount paid.
- **No sync:** data lives in one browser. Backup and restore is the way to move it.
- **The old app window:** anyone who installed it before v1.1 keeps it until they uninstall it from the window's ⋮ menu or edge://apps.

**Ideas if feedback points that way** (not promised):

- Arabic, Urdu or CJK PDF fonts, loaded only when needed
- previewing a History entry
- section headings within the item list
- a rounding line for totals that 2-decimal rates can't reach
- showing balance due in History
- recurring invoices or quotes
- more currencies in `words.ts`
- a custom domain

## Current state

- **Version:** v1.2.0. Released on 2026-09-24. Nothing is in progress.
- **History of releases:**
  - Milestones 1–10 built the app; M10 was tagged v1.0.0.
  - v1.1.0 was the first round of user feedback:
    - totals follow the Settings currency
    - an empty first run
    - the country step and presets
    - six templates
    - payment methods
    - amount in words
    - preview zoom
    - the installable app window removed
  - v1.2.0 was the second round, focused on legally correct UAE tax invoices:
    - FTA layout: No., unit, qty, rate, amount, VAT rate, VAT and total with VAT on every line; total before VAT and grand total
    - legal checks per country, with Download anyway
    - tax number labels and format checks (TRN required in the UAE)
    - "Tax Invoice" capitalised
    - tax included and grand-total fitting instead of the old inclusive mode
    - units, LPO/PO, date of supply, due date or payment terms (on delivery, 15–90 days), advance payments
    - bank detail fields, and payment details editable per invoice
    - signature and stamp (upload or draw)
    - country guessed on first run
    - logo picker fixes for Android
- **Health:**
  - all checks and CI pass; 575 tests; domain and storage coverage 100%
  - start-up JS about 146 KB gzipped (the payment and signature forms now live in the editor)
  - axe clean in both themes
  - zero CSP violations
- **Waiting on:** the next round of feedback from the user.
