import { ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { ACCEPTED_LOGO_TYPES, LogoError, prepareLogo } from '../../services/logo'
import { useLogoStore } from '../../storage/stores'

export function LogoField() {
  const logo = useLogoStore((state) => state.logo)
  const setLogo = useLogoStore((state) => state.setLogo)
  const removeLogo = useLogoStore((state) => state.removeLogo)
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      setLogo(await prepareLogo(file))
    } catch (problem) {
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
            <span className="text-xs text-[#a39c91]">No logo</span>
          )}
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <div className="flex gap-2">
            <Button size="sm" onClick={() => input.current?.click()} disabled={busy}>
              <ImagePlus />
              {busy ? 'Processing…' : logo ? 'Replace' : 'Upload logo'}
            </Button>
            {logo && (
              <Button size="sm" variant="ghost" onClick={removeLogo}>
                <Trash2 />
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-fg-subtle">PNG, JPG, WebP or SVG. Resized for print.</p>
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_LOGO_TYPES.join(',')}
        className="hidden"
        onChange={choose}
        aria-labelledby="logo-label"
        data-testid="logo-file-input"
      />
      <p role="status" className="text-xs font-medium text-fg empty:hidden">
        {error}
      </p>
    </div>
  )
}
