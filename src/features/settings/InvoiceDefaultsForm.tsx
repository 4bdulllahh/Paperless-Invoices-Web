import { useMemo, type ReactNode } from 'react'
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
} from '../../domain/options'
import { percentSchema, TEMPLATE_IDS, type TaxMode, type TemplateId } from '../../domain/schema'
import { useSettingsStore } from '../../storage/stores'

const TAX_MODE_OPTIONS = [
  { value: 'exclusive', label: 'Tax added on top' },
  { value: 'inclusive', label: 'Tax included' },
] as const satisfies readonly { value: TaxMode; label: string }[]

const TEMPLATE_OPTIONS = TEMPLATE_IDS.map((id) => ({
  value: id,
  label: id[0].toUpperCase() + id.slice(1),
}))

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

/** Defaults for new invoices. Saved as the user types; invalid values are explained, not saved. */
export function InvoiceDefaultsForm() {
  const settings = useSettingsStore()
  const { updateSettings } = settings
  const today = todayIso()
  const currencies = useMemo(() => currencyOptions(settings.locale), [settings.locale])
  const locales = useMemo(() => localeOptions(settings.locale), [settings.locale])

  return (
    <div className="flex flex-col gap-7">
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
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg-muted">Prices you enter have</span>
          <SegmentedControl
            label="Prices you enter have"
            options={TAX_MODE_OPTIONS}
            value={settings.taxMode}
            onChange={(taxMode) => updateSettings({ taxMode })}
            className="self-start"
          />
        </div>
      </Group>

      <Group title="Terms & numbering">
        <SelectField
          label="Payment terms"
          value={String(settings.paymentTermsDays)}
          onChange={(e) => updateSettings({ paymentTermsDays: Number(e.target.value) })}
          hint="Sets the due date on new invoices."
        >
          {paymentTermsOptions(settings.paymentTermsDays).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
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

      <Group title="Template">
        <SegmentedControl
          label="Default template"
          options={TEMPLATE_OPTIONS}
          value={settings.templateId}
          onChange={(templateId: TemplateId) => updateSettings({ templateId })}
          className="self-start"
        />
      </Group>
    </div>
  )
}
