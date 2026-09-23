import { TextAreaField, TextField } from '../../components/ui/Field'
import { taxIdIssue, taxIdRules } from '../../domain/compliance'
import { businessIssues } from '../../domain/records'
import { useProfileStore, useSettingsStore } from '../../storage/stores'
import { LogoField } from './LogoField'

type BusinessDetailsFormProps = {
  /** Show "name is required" before the user has tried to continue. */
  showRequired?: boolean
}

/** Who the invoice is from. Saved as the user types. */
export function BusinessDetailsForm({ showRequired = false }: BusinessDetailsFormProps) {
  const business = useProfileStore((state) => state.business)
  const updateBusiness = useProfileStore((state) => state.updateBusiness)
  const issues = businessIssues(business)
  const country = useSettingsStore((state) => state.country)
  const taxIdLabel = useSettingsStore((state) => state.taxIdLabel) || 'Tax ID'
  const taxId = taxIdRules(country)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Business name"
          placeholder="Acme Studio"
          autoComplete="organization"
          value={business.name}
          onChange={(e) => updateBusiness({ name: e.target.value })}
          error={showRequired ? issues.name : undefined}
          required
        />
        <TextField
          label="Email"
          optional
          type="email"
          placeholder="hello@acme.studio"
          autoComplete="email"
          value={business.email}
          onChange={(e) => updateBusiness({ email: e.target.value })}
          error={issues.email}
        />
        <TextField
          label="Phone"
          optional
          type="tel"
          placeholder="+1 555 0100"
          autoComplete="tel"
          value={business.phone}
          onChange={(e) => updateBusiness({ phone: e.target.value })}
        />
        <TextField
          label={taxIdLabel}
          optional={!taxId.required}
          required={taxId.required}
          placeholder={taxId.example || 'Your tax registration number'}
          autoComplete="off"
          spellCheck={false}
          hint={`Just the number, without “${taxIdLabel}” in front.`}
          error={
            taxIdIssue(country, business.taxId, taxIdLabel) ??
            (showRequired && taxId.required && !business.taxId.trim()
              ? `Invoices here must show your ${taxIdLabel}.`
              : undefined)
          }
          value={business.taxId}
          onChange={(e) => updateBusiness({ taxId: e.target.value })}
        />
      </div>
      <TextAreaField
        label="Address"
        optional
        placeholder={'12 Harbour Street\nBrooklyn, NY 11201'}
        autoComplete="street-address"
        value={business.address}
        onChange={(e) => updateBusiness({ address: e.target.value })}
      />
      <LogoField />
    </div>
  )
}
