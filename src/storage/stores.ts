import { createInvoiceDraft, emptyParty, sameParty } from '../domain/draft'
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

/* Logo: a resized PNG. IndexedDB, because images are large. */

type LogoData = { logo: Logo | null }

export const useLogoStore = createPersistedStore(
  {
    name: 'paperless:logo',
    version: 1,
    schema: z.object({ logo: logoSchema.nullable() }),
    backend: idbBackend,
  },
  { logo: null } as LogoData,
  (set) => ({
    setLogo: (logo: Logo) => set({ logo }),
    removeLogo: () => set({ logo: null }),
  }),
)

/* Settings: defaults applied to every new invoice. localStorage. */

export const initialSettings: Settings = {
  currency: 'USD',
  locale: browserLocale(),
  taxMode: 'exclusive',
  taxLabel: 'Tax',
  defaultTaxRate: '',
  paymentTermsDays: 14,
  numberPattern: DEFAULT_NUMBER_PATTERN,
  nextSequence: 1,
  templateId: 'modern',
}

export const useSettingsStore = createPersistedStore(
  { name: 'paperless:settings', version: 1, schema: settingsSchema, backend: localBackend },
  initialSettings,
  (set, get) => ({
    updateSettings: (patch: Partial<Settings>) => set(patch),
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
    version: 1,
    schema: z.object({ invoice: invoiceSchema.nullable() }),
    backend: localBackend,
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

type HistoryData = { entries: HistoryEntry[] }

export const useHistoryStore = createPersistedStore(
  {
    name: 'paperless:history',
    version: 1,
    schema: z.object({ entries: z.array(historyEntrySchema) }),
    backend: idbBackend,
  },
  { entries: [] } as HistoryData,
  (set) => ({
    /** Save a snapshot of a downloaded invoice. Downloading the same invoice again replaces it. */
    recordInvoice: (invoice: Invoice) =>
      set((state) => {
        const previous = state.entries.find((e) => e.invoice.id === invoice.id)
        const entry: HistoryEntry = {
          id: previous?.id ?? newId(),
          invoice: structuredClone(invoice),
          savedAt: new Date().toISOString(),
          status: previous?.status ?? 'unpaid',
          paidAt: previous?.paidAt ?? null,
        }
        return { entries: [entry, ...state.entries.filter((e) => e !== previous)] }
      }),
    setStatus: (id: string, status: HistoryStatus, paidAt: string | null = null) =>
      set((state) => ({
        entries: state.entries.map((e) =>
          e.id === id ? { ...e, status, paidAt: status === 'paid' ? paidAt : null } : e,
        ),
      })),
    removeEntry: (id: string) =>
      set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
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
