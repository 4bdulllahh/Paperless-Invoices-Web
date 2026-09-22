# Paperless

Free, private invoicing that runs entirely in your browser.

Create professional A4 invoices, preview them live across multiple templates, add a payment QR code, and download a crisp PDF. No account, no server and no database. Your business details and invoice history are stored only on your device.

**Live:** https://paperless-bay-zeta.vercel.app

> **Status:** early development (Milestone 4 — onboarding, business profile and settings).

## Principles

- **Local-first.** All data lives in browser storage (localStorage + IndexedDB). Nothing is sent over the network.
- **Zero cost.** A static site on Vercel's free tier. No backend to run or pay for.
- **Everything on one screen.** Editor, live preview and actions are always visible together.

## Tech stack

| Area      | Choice                                                                           |
| --------- | -------------------------------------------------------------------------------- |
| Framework | React 19 + TypeScript (strict) + Vite                                            |
| Styling   | Tailwind CSS v4, self-hosted Inter & Space Grotesk                               |
| Quality   | oxlint, Prettier, Vitest + Testing Library, GitHub Actions CI                    |
| Planned   | Zustand + Zod (storage), @react-pdf/renderer + pdf.js (PDF), qrcode (payment QR) |

## How totals are calculated

The calculation engine in [`src/domain`](src/domain) is plain TypeScript with no UI code, and is held at 100% test coverage.

- **No floating point.** Amounts are stored as the text the user typed (`"19.99"`) and calculated as exact integers, so `1.005` rounds to `1.01`, not `1.00`.
- **Currency-aware precision.** Rounds to the currency's minor unit: cents for USD, whole yen for JPY, fils (3 decimals) for KWD.
- **Discounts before tax.** An invoice-level discount is split across lines in proportion, so each tax rate is charged on the correct amount, and the shares always add up exactly.
- **Tax per rate.** Tax is rounded once per rate on the combined amount, not line by line. Both tax-exclusive (added on top) and tax-inclusive (already in the price) modes are supported.
- **Rounding** is half away from zero at each step.

## Getting started

Requires Node.js 24 (see `.nvmrc`).

```bash
npm install
npm run dev        # start the dev server at http://localhost:5173
```

## Scripts

| Command                 | What it does                                                         |
| ----------------------- | -------------------------------------------------------------------- |
| `npm run dev`           | Start the Vite dev server                                            |
| `npm run build`         | Type-check and build for production into `dist/`                     |
| `npm run preview`       | Serve the production build locally                                   |
| `npm test`              | Run unit tests once (`npm run test:watch` to watch)                  |
| `npm run test:coverage` | Run tests with coverage; `src/domain` and `src/storage` stay at 100% |
| `npm run lint`          | Lint with oxlint                                                     |
| `npm run format`        | Format all files with Prettier                                       |
| `npm run check`         | Lint, format check, type-check and test — the same checks CI runs    |

## Roadmap

- [x] **M0** Environment & skeleton
- [x] **M1** Design system & 3-pane app shell
- [x] **M2** Domain core (money, tax & discount engine)
- [x] **M3** Storage layer (persistence, migrations, backup)
- [x] **M4** Onboarding & settings
- [ ] **M5** Invoice editor
- [ ] **M6** PDF templates & live preview
- [ ] **M7** QR payments
- [ ] **M8** Export & history
- [ ] **M9** Polish, accessibility & PWA
- [ ] **M10** Production release

## License

MIT
