import type { ReactNode } from 'react'
import { TextAreaField, TextField } from '../../../components/ui/Field'
import type { Party } from '../../../domain/schema'

type PartyFieldsProps = {
  party: Party
  onChange: (patch: Partial<Party>) => void
  /** Replaces the plain name field, e.g. with the saved-client combobox. */
  nameField?: ReactNode
  namePlaceholder: string
  /** What the tax number is called where the business is, e.g. "TRN" or "VAT no.". */
  taxId: {
    label: string
    /** The law there requires it, so it isn't marked optional. */
    required?: boolean
    /** A number in the right format, for the placeholder. */
    example?: string
    /** Why the typed number looks wrong. */
    issue?: string
  }
}

/** Name, contact details and address for either side of the invoice. */
export function PartyFields({
  party,
  onChange,
  nameField,
  namePlaceholder,
  taxId,
}: PartyFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      {nameField ?? (
        <TextField
          label="Name"
          placeholder={namePlaceholder}
          value={party.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Email"
          optional
          type="email"
          value={party.email}
          onChange={(e) => onChange({ email: e.target.value })}
        />
        <TextField
          label="Phone"
          optional
          type="tel"
          value={party.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
        />
      </div>
      <TextAreaField
        label="Address"
        optional
        rows={2}
        value={party.address}
        onChange={(e) => onChange({ address: e.target.value })}
      />
      <TextField
        label={taxId.label}
        optional={!taxId.required}
        required={taxId.required}
        placeholder={taxId.example}
        autoComplete="off"
        spellCheck={false}
        hint={`Just the number, without “${taxId.label}” in front.`}
        error={taxId.issue}
        value={party.taxId}
        onChange={(e) => onChange({ taxId: e.target.value })}
      />
    </div>
  )
}
