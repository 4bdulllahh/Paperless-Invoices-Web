# Paperless

Free, private invoicing that runs entirely in your browser.

Create professional A4 invoices, preview them live across multiple templates, add a payment QR code, and download a crisp PDF. No account, no server and no database. Your business details and invoice history are stored only on your device.

> **Status:** early development (Milestone 0 — project skeleton).

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

## Getting started

Requires Node.js 24 (see `.nvmrc`).

```bash
npm install
npm run dev        # start the dev server at http://localhost:5173
```

## Scripts

| Command           | What it does                                                      |
| ----------------- | ----------------------------------------------------------------- |
| `npm run dev`     | Start the Vite dev server                                         |
| `npm run build`   | Type-check and build for production into `dist/`                  |
| `npm run preview` | Serve the production build locally                                |
| `npm test`        | Run unit tests once (`npm run test:watch` to watch)               |
| `npm run lint`    | Lint with oxlint                                                  |
| `npm run format`  | Format all files with Prettier                                    |
| `npm run check`   | Lint, format check, type-check and test — the same checks CI runs |

## Roadmap

- [x] **M0** Environment & skeleton
- [ ] **M1** Design system & 3-pane app shell
- [ ] **M2** Domain core (money, tax & discount engine)
- [ ] **M3** Storage layer (persistence, migrations, backup)
- [ ] **M4** Onboarding & settings
- [ ] **M5** Invoice editor
- [ ] **M6** PDF templates & live preview
- [ ] **M7** QR payments
- [ ] **M8** Export & history
- [ ] **M9** Polish, accessibility & PWA
- [ ] **M10** Production release

## License

MIT
