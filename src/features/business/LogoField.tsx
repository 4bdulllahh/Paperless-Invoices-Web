import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useHydrated } from '../../hooks/useHydrated'
import { LogoError, prepareLogo } from '../../services/logo'
import { useLogoStore } from '../../storage/stores'
import { ImagePicker } from './ImagePicker'

export function LogoField() {
  const logo = useLogoStore((state) => state.logo)
  // The logo loads from IndexedDB; don't claim there's none before it has.
  const loaded = useHydrated(useLogoStore)
  const setLogo = useLogoStore((state) => state.setLogo)
  const removeLogo = useLogoStore((state) => state.removeLogo)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function choose(file: File) {
    setBusy(true)
    setError(null)
    try {
      setLogo(await prepareLogo(file))
    } catch (problem) {
      console.error('[paperless] logo failed', problem)
      setError(problem instanceof LogoError ? problem.message : 'That image couldn’t be used.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-fg-muted" id="logo-label">
        Logo <span className="font-normal text-fg-subtle">(optional)</span>
      </span>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-40 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line-strong bg-white p-2">
          {logo ? (
            <img src={logo.dataUrl} alt="Your logo" className="size-full object-contain" />
          ) : (
            <span className="text-xs text-[#6b665f]">{loaded ? 'No logo' : 'Loading…'}</span>
          )}
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <div className="flex flex-wrap gap-2">
            <ImagePicker
              label={logo ? 'Replace' : 'Upload logo'}
              busy={busy}
              disabled={!loaded}
              labelledBy="logo-label"
              onFile={(file) => void choose(file)}
              testId="logo-file-input"
            />
            {logo && (
              <Button size="sm" variant="ghost" onClick={removeLogo}>
                <Trash2 />
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-fg-subtle">
            Any image: PNG, JPG, WebP, SVG… Resized for print.
          </p>
        </div>
      </div>
      <p role="status" className="text-xs font-medium text-fg empty:hidden">
        {error}
      </p>
    </div>
  )
}
