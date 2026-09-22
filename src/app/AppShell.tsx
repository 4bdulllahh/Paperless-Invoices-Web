import { Eye, PenLine } from 'lucide-react'
import { useState } from 'react'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { BusinessPanel } from '../features/business/BusinessPanel'
import { ClientsPanel } from '../features/clients/ClientsPanel'
import { EditorPane } from '../features/editor/EditorPane'
import { OnboardingWizard } from '../features/onboarding/OnboardingWizard'
import { PreviewPane } from '../features/preview/PreviewPane'
import { SettingsPanel } from '../features/settings/SettingsPanel'
import { useTheme } from '../hooks/useTheme'
import { cn } from '../lib/cn'
import { useProfileStore } from '../storage/stores'
import { NAV_ITEMS, type PanelId } from './navigation'
import { NavRail } from './NavRail'
import { PlaceholderPanel } from './PlaceholderPanel'
import { StorageIssueBanner } from './StorageIssueBanner'
import { TopBar } from './TopBar'

type MobileView = 'edit' | 'preview'

const MOBILE_VIEW_OPTIONS = [
  {
    value: 'edit',
    label: (
      <>
        <PenLine className="size-4" aria-hidden="true" />
        Edit
      </>
    ),
  },
  {
    value: 'preview',
    label: (
      <>
        <Eye className="size-4" aria-hidden="true" />
        Preview
      </>
    ),
  },
] as const

/**
 * Single-screen workspace: the page never scrolls, only the panes inside it.
 * Desktop (lg+): nav rail | editor | preview side by side.
 * Smaller screens: Edit/Preview toggle, with navigation in a bottom tab bar.
 */
export function AppShell() {
  const { resolved, toggle } = useTheme()
  const [panel, setPanel] = useState<PanelId>('invoice')
  const [mobileView, setMobileView] = useState<MobileView>('edit')

  const onboardingComplete = useProfileStore((state) => state.onboardingComplete)

  const onInvoice = panel === 'invoice'
  const activeItem = NAV_ITEMS.find((item) => item.id === panel) ?? NAV_ITEMS[0]

  return (
    <>
      {/* While setup runs, the workspace can't be clicked, tabbed to or read out. */}
      <div className="flex h-dvh flex-col gap-2 p-2 sm:gap-3 sm:p-3" inert={!onboardingComplete}>
        <TopBar theme={resolved} onToggleTheme={toggle} />
        <StorageIssueBanner />

        {onInvoice && (
          <SegmentedControl
            label="Workspace view"
            options={MOBILE_VIEW_OPTIONS}
            value={mobileView}
            onChange={setMobileView}
            className="flex shrink-0 lg:hidden"
          />
        )}

        <div className="flex min-h-0 flex-1 gap-3">
          <NavRail
            orientation="vertical"
            active={panel}
            onSelect={setPanel}
            className="hidden lg:flex"
          />

          <main className="grid min-h-0 min-w-0 flex-1 gap-3 lg:grid-cols-[minmax(380px,2fr)_minmax(0,3fr)]">
            {onInvoice ? (
              <EditorPane
                className={cn(mobileView === 'preview' && 'max-lg:hidden')}
                onEditProfile={() => setPanel('business')}
              />
            ) : panel === 'settings' ? (
              <SettingsPanel />
            ) : panel === 'business' ? (
              <BusinessPanel />
            ) : panel === 'clients' ? (
              <ClientsPanel
                onUseClient={() => {
                  setPanel('invoice')
                  setMobileView('edit')
                }}
              />
            ) : (
              <PlaceholderPanel item={activeItem} />
            )}
            <PreviewPane className={cn((!onInvoice || mobileView === 'edit') && 'max-lg:hidden')} />
          </main>
        </div>

        <NavRail
          orientation="horizontal"
          active={panel}
          onSelect={setPanel}
          className="flex lg:hidden"
        />
      </div>
      {!onboardingComplete && <OnboardingWizard />}
    </>
  )
}
