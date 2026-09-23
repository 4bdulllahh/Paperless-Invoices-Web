import { PenLine, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useHydrated } from '../../hooks/useHydrated'
import type { Logo } from '../../domain/records'
import { LogoError, prepareSignature } from '../../services/logo'
import { useLogoStore, useSettingsStore, type SignatureImage } from '../../storage/stores'
import { ImagePicker } from './ImagePicker'
import { SignaturePad } from './SignaturePad'

const LABELS: Record<SignatureImage, { name: string; empty: string; alt: string }> = {
  signature: { name: 'Signature', empty: 'No signature', alt: 'Your signature' },
  stamp: { name: 'Company stamp', empty: 'No stamp', alt: 'Your company stamp' },
}

/**
 * The signature and company stamp printed on signed invoices, kept with the business profile.
 * Photos of paper lose their white background. Adding the first one signs new invoices.
 */
export function SignatureFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ImageSlot kind="signature" />
      <ImageSlot kind="stamp" />
    </div>
  )
}

function ImageSlot({ kind }: { kind: SignatureImage }) {
  const image = useLogoStore((state) => state[kind])
  const loaded = useHydrated(useLogoStore)
  const setImage = useLogoStore((state) => state.setImage)
  const [busy, setBusy] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const labelId = useId()
  const text = LABELS[kind]

  function save(next: Logo) {
    const settings = useSettingsStore.getState()
    const first = !useLogoStore.getState().signature && !useLogoStore.getState().stamp
    setImage(kind, next)
    if (first && !settings.signInvoices) settings.updateSettings({ signInvoices: true })
  }

  async function choose(file: File) {
    setBusy(true)
    setError(null)
    try {
      save(await prepareSignature(file))
    } catch (problem) {
      console.error(`[paperless] ${kind} failed`, problem)
      setError(problem instanceof LogoError ? problem.message : 'That image couldn’t be used.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-fg-muted" id={labelId}>
        {text.name} <span className="font-normal text-fg-subtle">(optional)</span>
      </span>
      {drawing ? (
        <SignaturePad
          onSave={(signature) => {
            save(signature)
            setDrawing(false)
          }}
          onCancel={() => setDrawing(false)}
        />
      ) : (
        <>
          <div className="flex h-20 w-40 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line-strong bg-white p-2">
            {image ? (
              <img src={image.dataUrl} alt={text.alt} className="size-full object-contain" />
            ) : (
              <span className="text-xs text-[#6b665f]">{loaded ? text.empty : 'Loading…'}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <ImagePicker
              label={image ? 'Replace' : 'Upload'}
              busy={busy}
              disabled={!loaded}
              labelledBy={labelId}
              onFile={(file) => void choose(file)}
            />
            {kind === 'signature' && (
              <Button size="sm" variant="ghost" onClick={() => setDrawing(true)} disabled={!loaded}>
                <PenLine />
                Draw
              </Button>
            )}
            {image && (
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Remove ${text.name.toLowerCase()}`}
                onClick={() => setImage(kind, null)}
              >
                <Trash2 />
                Remove
              </Button>
            )}
          </div>
        </>
      )}
      <p role="status" className="text-xs font-medium text-fg empty:hidden">
        {error}
      </p>
    </div>
  )
}
