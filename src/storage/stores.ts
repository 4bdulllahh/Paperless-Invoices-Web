import {
  createInvoiceDraft,
  duplicateInvoice,
  emptyParty,
  followDefaults,
  sameParty,
} from '../domain/draft'
import { todayIso } from '../domain/dates'
import { DEFAULT_NUMBER_PATTERN } from '../domain/numbering'
import {
  businessProfileSchema,
  clientSchema,
  emptyPaymentDetails,
  historyEntrySchema,
  logoSchema,
  settingsSchema,
  type BusinessProfile,
  type Client,
  type HistoryEntry,
  type HistoryStatus,
  type Logo,
  type PaymentDetails,
  type PrintAssets,
  type Settings,
} from '../domain/records'
import { invoiceSchema, type Invoice, type Party } from '../domain/schema'
import { z } from 'zod'
import { idbBackend, localBackend } from './backends'
import { createPersistedStore } from './persisted'

const newId = () => crypto.randomUUID()

function browserLocale(): string {
  try {
    return Intl.getCanonicalLocales(navigator.language)[0] ?? 'en-US'
  } catch {
    return 'en-US'
  }
}

/* Business profile: who is sending the invoices, and how to pay them. localStorage. */

const initialProfile: BusinessProfile = {
  business: emptyParty(),
  payment: emptyPaymentDetails(),
  onboardingComplete: false,
}

export const useProfileStore = createPersistedStore(
  {
    name: 'paperless:profile',
    version: 3,
    schema: businessProfileSchema,
    backend: localBackend,
    migrations: {
      // Version 2 added payment details.
      2: (state) => ({ ...(state as object), payment: { instructions: '', link: '' } }),
      // Version 3 added payment QR codes. A saved link was already promised one.
      3: (state) => {
        const profile = state as { payment: { instructions: string; link: string } }
        return { ...profile, payment: { ...emptyPaymentDetails(), ...profile.payment } }
      },
    },
  },
  initialProfile,
  (set, get) => ({
    /**
     * Update the business details. The current draft follows along until its sender details
     * have been edited on the invoice itself.
     */
    updateBusiness: (patch: Partial<Party>) => {
      const before = get().business
      const business = { ...before, ...patch }
      set({ business })
      useDraftStore
        .getState()
        .updateInvoice((invoice) =>
          sameParty(invoice.from, before) ? { ...invoice, from: { ...business } } : invoice,
        )
    },
    updatePayment: (patch: Partial<PaymentDetails>) =>
      set((state) => ({ payment: { ...state.payment, ...patch } })),
    completeOnboarding: () => set({ onboardingComplete: true }),
    /** Show the setup wizard again. Nothing is erased. */
    restartOnboarding: () => set({ onboardingComplete: false }),
  }),
)

/* Logo, signature and stamp: resized images. IndexedDB, because images are large. */

type LogoData = { logo: Logo | null; signature: Logo | null; stamp: Logo | null }

/** The images an invoice can carry besides its logo. */
export type SignatureImage = 'signature' | 'stamp'

export const useLogoStore = createPersistedStore(
  {
    name: 'paperless:logo',
    version: 1,
    schema: z.object({
      logo: logoSchema.nullable(),
      // Added in 1.2.
      signature: logoSchema.nullable().default(null),
      stamp: logoSchema.nullable().default(null),
    }),
    backend: idbBackend,
  },
  { logo: null, signature: null, stamp: null } as LogoData,
  (set) => ({
    setLogo: (logo: Logo) => set({ logo }),
    removeLogo: () => set({ logo: null }),
    setImage: (kind: SignatureImage, image: Logo | null) => set({ [kind]: image }),
  }),
)

/* Settings: defaults applied to every new invoice. localStorage. */

export const initialSettings: Settings = {
  currency: 'USD',
  locale: browserLocale(),
  taxMode: 'exclusive',
  // Left for the user (or their country) to fill in.
  taxLabel: '',
  defaultTaxRate: '',
  paymentTermsDays: 30,
  numberPattern: DEFAULT_NUMBER_PATTERN,
  nextSequence: 1,
  templateId: 'modern',
  country: '',
  documentTitle: 'Invoice',
  taxIdLabel: 'Tax ID',
  amountInWords: false,
  dueMode: 'date',
  showLineTax: false,
  signInvoices: false,
}

/** "Tax invoice" as saved before 1.2, when the second word wasn't capitalised. */
const titleCase = (title: unknown) => (title === 'Tax invoice' ? 'Tax Invoice' : title)

export const useSettingsStore = createPersistedStore(
  {
    name: 'paperless:settings',
    version: 2,
    schema: settingsSchema,
    backend: localBackend,
    migrations: {
      // Version 2 writes "Tax Invoice" with a capital I.
      2: (state) => {
        const settings = state as { documentTitle?: unknown }
        return { ...settings, documentTitle: titleCase(settings.documentTitle) }
      },
    },
  },
  initialSettings,
  (set, get) => ({
    /**
     * Change the defaults. The current draft follows along, field by field, until it has been
     * edited on the invoice itself. A draft already downloaded stays as it was sent.
     */
    updateSettings: (patch: Partial<Settings>) => {
      const before = get()
      set(patch)
      const after = get()
      const issued = new Set(useHistoryStore.getState().entries.map((e) => e.invoice.id))
      useDraftStore
        .getState()
        .updateInvoice((invoice) =>
          issued.has(invoice.id) ? invoice : followDefaults(invoice, before, after),
        )
    },
    /** Use the next invoice number. Called when an invoice is downloaded. */
    claimSequence: (): number => {
      const sequence = get().nextSequence
      set({ nextSequence: sequence + 1 })
      return sequence
    },
  }),
)

/* Draft: the invoice being edited, autosaved. localStorage. */

type DraftData = { invoice: Invoice | null }

export const useDraftStore = createPersistedStore(
  {
    name: 'paperless:draft',
    version: 2,
    schema: z.object({ invoice: invoiceSchema.nullable() }),
    backend: localBackend,
    migrations: {
      // Version 2 writes "Tax Invoice" with a capital I.
      2: (state) => {
        const { invoice } = state as { invoice: { title?: unknown } | null }
        return { invoice: invoice && { ...invoice, title: titleCase(invoice.title) } }
      },
    },
  },
  { invoice: null } as DraftData,
  (set) => ({
    /** Start a new invoice from the current settings and business profile. */
    startNewInvoice: (today = todayIso()): Invoice => {
      const invoice = createInvoiceDraft({
        id: newId(),
        lineId: newId(),
        today,
        settings: useSettingsStore.getState(),
        business: useProfileStore.getState().business,
      })
      set({ invoice })
      return invoice
    },
    /** Open a copy of an earlier invoice as the new draft, with the next number and today's date. */
    duplicateIntoDraft: (source: Invoice, today = todayIso()): Invoice => {
      const invoice = duplicateInvoice({
        source,
        id: newId(),
        newLineId: newId,
        today,
        settings: useSettingsStore.getState(),
        business: useProfileStore.getState().business,
      })
      set({ invoice })
      return invoice
    },
    setInvoice: (invoice: Invoice) => set({ invoice }),
    updateInvoice: (update: (invoice: Invoice) => Invoice) =>
      set((state) => (state.invoice ? { invoice: update(state.invoice) } : {})),
    clearDraft: () => set({ invoice: null }),
  }),
)

/* Clients: saved "Bill to" details. IndexedDB. */

type ClientsData = { clients: Client[] }

export const useClientsStore = createPersistedStore(
  {
    name: 'paperless:clients',
    version: 1,
    schema: z.object({ clients: z.array(clientSchema) }),
    backend: idbBackend,
  },
  { clients: [] } as ClientsData,
  (set) => ({
    /** Add a client, or update the one with the same id. Returns its id. */
    saveClient: (party: Party, id?: string): string => {
      const clientId = id ?? newId()
      set((state) => {
        const existing = state.clients.find((c) => c.id === clientId)
        const client: Client = {
          ...party,
          id: clientId,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
        }
        return {
          clients: existing
            ? state.clients.map((c) => (c.id === clientId ? client : c))
            : [...state.clients, client],
        }
      })
      return clientId
    },
    removeClient: (id: string) =>
      set((state) => ({ clients: state.clients.filter((c) => c.id !== id) })),
  }),
)

/* History: downloaded invoices, newest first. IndexedDB. */

type HistoryData = {
  entries: HistoryEntry[]
  /**
   * Logos, signatures and stamps the entries were printed with, by id. Each is stored once,
   * however many use it.
   */
  logos: Record<string, Logo>
}

/** Drop images no entry uses any more. */
function usedLogos(logos: Record<string, Logo>, entries: HistoryEntry[]): Record<string, Logo> {
  const used = new Set(
    entries.flatMap((e) => [
      e.issuedWith?.logoId,
      e.issuedWith?.signatureId,
      e.issuedWith?.stampId,
    ]),
  )
  return Object.fromEntries(Object.entries(logos).filter(([id]) => used.has(id)))
}

export const useHistoryStore = createPersistedStore(
  {
    name: 'paperless:history',
    version: 2,
    schema: z.object({
      entries: z.array(historyEntrySchema),
      logos: z.record(z.string(), logoSchema),
    }),
    backend: idbBackend,
    migrations: {
      // Version 2 keeps the payment details and logo each invoice was printed with. Older
      // entries didn't record them, so they go on printing with the current ones.
      2: (state) => {
        const { entries } = state as { entries: object[] }
        return { entries: entries.map((e) => ({ ...e, issuedWith: null })), logos: {} }
      },
    },
  },
  { entries: [], logos: {} } as HistoryData,
  (set) => ({
    /**
     * Save a snapshot of a downloaded invoice, with the payment details and images it was
     * printed with. Downloading the same invoice again replaces it and keeps its paid status.
     */
    recordInvoice: (invoice: Invoice, { payment, logo, signature, stamp }: PrintAssets) =>
      set((state) => {
        const previous = state.entries.find((e) => e.invoice.id === invoice.id)
        let logos = state.logos
        const store = (image: Logo | null): string | null => {
          if (!image) return null
          let id = Object.keys(logos).find((key) => logos[key].dataUrl === image.dataUrl)
          if (!id) {
            id = newId()
            logos = { ...logos, [id]: { ...image } }
          }
          return id
        }
        const entry: HistoryEntry = {
          id: previous?.id ?? newId(),
          invoice: structuredClone(invoice),
          issuedWith: {
            payment: { ...payment },
            logoId: store(logo),
            signatureId: store(signature),
            stampId: store(stamp),
          },
          savedAt: new Date().toISOString(),
          status: previous?.status ?? 'unpaid',
          paidAt: previous?.paidAt ?? null,
        }
        const entries = [entry, ...state.entries.filter((e) => e !== previous)]
        return { entries, logos: usedLogos(logos, entries) }
      }),
    setStatus: (id: string, status: HistoryStatus, paidAt: string | null = null) =>
      set((state) => ({
        entries: state.entries.map((e) =>
          e.id === id ? { ...e, status, paidAt: status === 'paid' ? paidAt : null } : e,
        ),
      })),
    removeEntry: (id: string) =>
      set((state) => {
        const entries = state.entries.filter((e) => e.id !== id)
        return { entries, logos: usedLogos(state.logos, entries) }
      }),
  }),
)

/** Every saved store, in backup order. */
export const PERSISTED_STORES = {
  profile: useProfileStore,
  logo: useLogoStore,
  settings: useSettingsStore,
  draft: useDraftStore,
  clients: useClientsStore,
  history: useHistoryStore,
} as const

export type StoreKey = keyof typeof PERSISTED_STORES
