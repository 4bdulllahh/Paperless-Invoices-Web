import type { ReactNode } from 'react'
import { TextAreaField, TextField } from '../../../components/ui/Field'
import type { Party } from '../../../domain/schema'

type PartyFieldsProps = {
  party: Party
  onChange: (patch: Partial<Party>) => void
  /** Replaces the plain name field, e.g. with the saved-client combobox. */
  nameField?: ReactNode
  namePlaceholder: string
}

/** Name, contact details and address for either side of the invoice. */
export function PartyFields({ party, onChange, nameField, namePlaceholder }: PartyFieldsProps) {
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
        label="Tax ID"
        optional
        value={party.taxId}
        onChange={(e) => onChange({ taxId: e.target.value })}
      />
    </div>
  )
}
