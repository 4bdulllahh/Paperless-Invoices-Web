import { lazy } from 'react'

/**
 * Everything except the invoice editor and preview loads on first use, so the first page is
 * smaller. After the first visit the service worker serves these from its cache instantly.
 */
export const HistoryPanel = lazy(() =>
  import('../features/history/HistoryPanel').then((m) => ({ default: m.HistoryPanel })),
)
export const ClientsPanel = lazy(() =>
  import('../features/clients/ClientsPanel').then((m) => ({ default: m.ClientsPanel })),
)
export const BusinessPanel = lazy(() =>
  import('../features/business/BusinessPanel').then((m) => ({ default: m.BusinessPanel })),
)
export const SettingsPanel = lazy(() =>
  import('../features/settings/SettingsPanel').then((m) => ({ default: m.SettingsPanel })),
)
/** Only first-time visitors see the setup wizard. */
export const OnboardingWizard = lazy(() =>
  import('../features/onboarding/OnboardingWizard').then((m) => ({
    default: m.OnboardingWizard,
  })),
)
