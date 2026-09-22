import { TextAreaField, TextField } from '../../components/ui/Field'
import { businessIssues } from '../../domain/records'
import { useProfileStore } from '../../storage/stores'
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
          label="Tax ID"
          optional
          placeholder="VAT, GST or EIN number"
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
