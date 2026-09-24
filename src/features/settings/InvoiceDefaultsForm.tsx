import { useMemo, type ReactNode } from 'react'
import { CheckboxField } from '../../components/ui/Checkbox'
import { ColorPicker } from '../../components/ui/ColorPicker'
import { CommitTextField } from '../../components/ui/CommitTextField'
import { SelectField, TextField } from '../../components/ui/Field'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { todayIso } from '../../domain/dates'
import { formatInvoiceNumber, hasSequenceToken } from '../../domain/numbering'
import {
  currencyOptions,
  formatSample,
  localeOptions,
  paymentTermsOptions,
  TEMPLATE_OPTIONS,
} from '../../domain/options'
import { percentSchema, type DueMode, type TemplateId } from '../../domain/schema'
import { useSettingsStore } from '../../storage/stores'
import { CountryField } from './CountryField'

const DUE_MODE_OPTIONS = [
  { value: 'date', label: 'Due date' },
  { value: 'terms', label: 'Payment terms' },
] as const satisfies readonly { value: DueMode; label: string }[]

function validateRate(text: string) {
  if (!percentSchema.safeParse(text).success) return 'Enter a percentage, e.g. 20 or 8.875.'
  if (Number(text) > 100) return 'A tax rate can’t be over 100%.'
}

function validatePattern(text: string) {
  if (!text.trim()) return 'Enter a format, e.g. INV-{YYYY}-{####}.'
  if (!hasSequenceToken(text)) return 'Include {####} so every invoice gets its own number.'
}

function validateSequence(text: string) {
  if (!/^\d{1,9}$/.test(text.trim()) || Number(text) < 1) return 'Enter a whole number, 1 or more.'
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-3 text-xs font-semibold tracking-wide text-fg-subtle uppercase">
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

/**
 * Defaults for new invoices. Saved as the user types; invalid values are explained, not saved.
 * The setup wizard asks for the country on its own step, so it can leave that group out.
 */
export function InvoiceDefaultsForm({ showCountry = true }: { showCountry?: boolean }) {
  const settings = useSettingsStore()
  const { updateSettings } = settings
  const today = todayIso()
  const currencies = useMemo(() => currencyOptions(settings.locale), [settings.locale])
  const locales = useMemo(() => localeOptions(settings.locale), [settings.locale])

  return (
    <div className="flex flex-col gap-7">
      {showCountry && (
        <Group title="Country">
          <CountryField hint="Changing it resets the currency, format and tax to that country’s." />
        </Group>
      )}

      <Group title="Money & format">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Currency"
            value={settings.currency}
            onChange={(e) => updateSettings({ currency: e.target.value })}
          >
            <optgroup label="Common">
              {currencies.common.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="All currencies">
              {currencies.others.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          </SelectField>
          <SelectField
            label="Number & date format"
            value={settings.locale}
            onChange={(e) => updateSettings({ locale: e.target.value })}
            hint={`Looks like: ${formatSample(settings.locale, settings.currency, today)}`}
          >
            {locales.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
        </div>
      </Group>

      <Group title="Tax">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Tax name"
            placeholder="VAT, GST or Sales tax"
            value={settings.taxLabel}
            onChange={(e) => updateSettings({ taxLabel: e.target.value })}
          />
          <CommitTextField
            label="Default tax rate (%)"
            optional
            inputMode="decimal"
            placeholder="20"
            hint="Applied to new line items. Leave empty for no tax."
            value={settings.defaultTaxRate}
            validate={validateRate}
            onCommit={(defaultTaxRate) => updateSettings({ defaultTaxRate: defaultTaxRate.trim() })}
          />
        </div>
        <TextField
          label="Tax number label"
          placeholder="VAT no., GSTIN, TRN, ABN…"
          hint="Printed before your tax number (and your client’s), e.g. “TRN: 100…”."
          value={settings.taxIdLabel}
          onChange={(e) => updateSettings({ taxIdLabel: e.target.value })}
        />
        <CheckboxField
          label="Show tax on each line"
          hint="The rate, amount and total with tax on every line, as Gulf and Indian tax invoices do."
          checked={settings.showLineTax}
          onChange={(e) => updateSettings({ showLineTax: e.target.checked })}
        />
      </Group>

      <Group title="Terms & numbering">
        <SelectField
          label="Payment terms"
          value={String(settings.paymentTermsDays)}
          onChange={(e) => updateSettings({ paymentTermsDays: Number(e.target.value) })}
          hint="Sets the due date on new invoices, or is printed instead of it."
        >
          {paymentTermsOptions(settings.paymentTermsDays).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg-muted">Print on invoices</span>
          <SegmentedControl
            label="Print on invoices"
            options={DUE_MODE_OPTIONS}
            value={settings.dueMode}
            onChange={(dueMode) => updateSettings({ dueMode })}
            className="self-start"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <CommitTextField
            label="Invoice number format"
            spellCheck={false}
            value={settings.numberPattern}
            validate={validatePattern}
            onCommit={(numberPattern) => updateSettings({ numberPattern })}
            hint={`Next: ${formatInvoiceNumber(settings.numberPattern, settings.nextSequence, today)}. Use {YYYY} for the year and {####} for the number.`}
          />
          <CommitTextField
            label="Next number"
            inputMode="numeric"
            value={String(settings.nextSequence)}
            validate={validateSequence}
            onCommit={(text) => updateSettings({ nextSequence: Number(text) })}
          />
        </div>
      </Group>

      <Group title="On the invoice">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Title"
            placeholder="Invoice"
            hint="Some countries require “Tax Invoice”."
            value={settings.documentTitle}
            onChange={(e) => updateSettings({ documentTitle: e.target.value })}
          />
          <SelectField
            label="Template"
            value={settings.templateId}
            onChange={(e) => updateSettings({ templateId: e.target.value as TemplateId })}
          >
            {TEMPLATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} — {o.description}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg-muted">PDF colour</span>
          <ColorPicker
            label="PDF colour for new invoices"
            align="left"
            className="self-start"
            value={settings.accentColor}
            onChange={(accentColor) => updateSettings({ accentColor })}
          />
          <p className="text-xs text-fg-subtle">
            Change it for one invoice from the preview. Text on it turns dark or white to stay
            readable.
          </p>
        </div>
        <CheckboxField
          label="Write the total in words"
          hint="e.g. “Four Thousand Two Hundred US Dollars.”, as many countries expect."
          checked={settings.amountInWords}
          onChange={(e) => updateSettings({ amountInWords: e.target.checked })}
        />
      </Group>
    </div>
  )
}
