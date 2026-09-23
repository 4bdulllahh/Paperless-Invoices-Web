import { Info } from 'lucide-react'
import { useMemo } from 'react'
import { SelectField } from '../../components/ui/Field'
import { countryName, countryOptions, countrySettings, findCountry } from '../../domain/countries'
import { useSettingsStore } from '../../storage/stores'

/** Chosen when the country isn't in the list: nothing is filled in for them. */
export const OTHER_COUNTRY = 'OTHER'

/**
 * Where the business is. Choosing a country fills in its currency, formats, tax and invoice
 * conventions; the summary says what was set and anything the law there asks for.
 */
export function CountryField({ error, hint }: { error?: string; hint?: string }) {
  const country = useSettingsStore((state) => state.country)
  const updateSettings = useSettingsStore((state) => state.updateSettings)
  const options = useMemo(() => countryOptions(), [])
  const preset = findCountry(country)

  return (
    <div className="flex flex-col gap-3">
      <SelectField
        label="Country your business is in"
        value={country}
        error={error}
        hint={hint}
        onChange={(e) => {
          const chosen = findCountry(e.target.value)
          updateSettings(chosen ? countrySettings(chosen) : { country: e.target.value })
        }}
      >
        <option value="" disabled>
          Choose a country…
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        <option value={OTHER_COUNTRY}>Somewhere else</option>
      </SelectField>

      {preset && (
        <div className="flex flex-col gap-2 rounded-md bg-surface-muted p-3 text-sm" role="status">
          <p>
            <span className="font-medium">Set up for {countryName(preset.code)}:</span>{' '}
            {[
              preset.currency,
              preset.taxLabel
                ? `${preset.taxLabel}${preset.taxRate ? ` ${preset.taxRate}%` : ''}`
                : 'no sales tax',
              `tax number shown as “${preset.taxIdLabel}”`,
              preset.title === 'Tax Invoice' && 'titled “Tax Invoice”',
              preset.lineTax && `${preset.taxLabel} shown on every line`,
              preset.amountInWords && 'total in words',
            ]
              .filter(Boolean)
              .join(' · ')}
            .
          </p>
          {preset.note && (
            <p className="flex items-start gap-2 text-fg-muted">
              <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              {preset.note}
            </p>
          )}
          <p className="text-xs text-fg-subtle">
            Standard rates as of 2026. Check they apply to you; you can change any of these.
          </p>
        </div>
      )}
      {country === OTHER_COUNTRY && (
        <p className="text-sm text-fg-muted">
          Choose your currency and tax details below. You can change the country any time.
        </p>
      )}
    </div>
  )
}
