import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CraneMark } from '../../components/brand/CraneMark'
import { Button } from '../../components/ui/Button'
import { countrySettings, findCountry, guessCountry } from '../../domain/countries'
import { businessIssues } from '../../domain/records'
import { cn } from '../../lib/cn'
import { finishOnboarding, loadSampleData } from '../../storage/onboarding'
import { requestPersistentStorage } from '../../storage/persistence'
import { useProfileStore, useSettingsStore } from '../../storage/stores'
import { BusinessDetailsForm } from '../business/BusinessDetailsForm'
import { DefaultPaymentDetailsForm } from '../business/PaymentDetailsForm'
import { CountryField } from '../settings/CountryField'
import { InvoiceDefaultsForm } from '../settings/InvoiceDefaultsForm'

const STEPS = [
  {
    title: 'Where is your business?',
    description: 'We’ll set up the currency, tax and invoice rules that apply there.',
  },
  { title: 'Your business', description: 'This appears at the top of every invoice.' },
  {
    title: 'Invoice defaults',
    description: 'Used for every new invoice. You can change them any time in Settings.',
  },
  { title: 'Getting paid', description: 'Tell clients how they can pay you. All optional.' },
] as const

/**
 * First-visit setup, shown over the workspace. Everything is saved as the user types, so a
 * reload mid-way loses nothing; finishing just marks setup as done.
 */
export function OnboardingWizard() {
  const [step, setStep] = useState(0)
  const [showRequired, setShowRequired] = useState(false)
  const business = useProfileStore((state) => state.business)
  const country = useSettingsStore((state) => state.country)
  const heading = useRef<HTMLHeadingElement>(null)
  const last = step === STEPS.length - 1

  // Move focus to each step's heading so keyboard and screen reader users start at the top.
  useEffect(() => heading.current?.focus(), [step])

  // Start from the country this device seems to be in; the user can change it.
  useEffect(() => {
    const settings = useSettingsStore.getState()
    if (settings.country) return
    const guess = findCountry(
      guessCountry(Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.languages ?? []),
    )
    if (guess) settings.updateSettings(countrySettings(guess))
  }, [])

  function finish() {
    finishOnboarding()
    // Now that there's data worth keeping, ask the browser not to clear it automatically.
    void requestPersistentStorage()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const incomplete =
      (step === 0 && !country) || (step === 1 && Object.keys(businessIssues(business)).length > 0)
    if (incomplete) {
      setShowRequired(true)
      return
    }
    setShowRequired(false)
    if (last) finish()
    else setStep(step + 1)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-canvas/70 p-2 backdrop-blur-sm sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-elev-2"
      >
        <header className="border-b border-line px-5 pt-5 pb-4 sm:px-7 sm:pt-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-flame text-ink">
              <CraneMark className="w-7" strokeWidth={1.25} />
            </span>
            <div className="min-w-0">
              <p
                id="onboarding-title"
                className="font-display text-lg font-semibold tracking-tight"
              >
                Set up Paperless
              </p>
              <p className="text-sm text-fg-subtle">
                About a minute. Everything stays on this device.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={finish}>
              Skip
            </Button>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <span className="text-xs font-medium whitespace-nowrap text-fg-subtle">
              Step {step + 1} of {STEPS.length}
            </span>
            <div className="flex flex-1 gap-1.5" aria-hidden="true">
              {STEPS.map((s, i) => (
                <span
                  key={s.title}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors duration-300',
                    i <= step ? 'bg-accent' : 'bg-surface-sunken',
                  )}
                />
              ))}
            </div>
          </div>
        </header>

        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
            <h2
              ref={heading}
              tabIndex={-1}
              className="font-display text-2xl font-semibold tracking-tight outline-none"
            >
              {STEPS[step].title}
            </h2>
            <p className="mt-1 text-fg-muted">{STEPS[step].description}</p>
            <div className="mt-6">
              {step === 0 && (
                <CountryField
                  error={
                    showRequired && !country
                      ? 'Choose your country, or “Somewhere else”.'
                      : undefined
                  }
                />
              )}
              {step === 1 && <BusinessDetailsForm showRequired={showRequired} />}
              {step === 2 && <InvoiceDefaultsForm showCountry={false} />}
              {step === 3 && <DefaultPaymentDetailsForm />}
            </div>
          </div>

          <footer className="flex items-center gap-2 border-t border-line bg-surface-muted px-5 py-4 sm:px-7">
            {step === 0 ? (
              <Button variant="ghost" onClick={() => loadSampleData()}>
                <Sparkles />
                <span className="hidden sm:inline">Explore with sample data</span>
                <span className="sm:hidden">Sample data</span>
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ArrowLeft />
                Back
              </Button>
            )}
            <Button type="submit" variant="primary" className="ml-auto">
              {last ? 'Finish setup' : 'Continue'}
              {!last && <ArrowRight />}
            </Button>
          </footer>
        </form>
      </div>
    </div>
  )
}
