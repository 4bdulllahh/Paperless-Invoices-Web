import { FolderOpen, ImagePlus } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { ACCEPTED_LOGO_TYPES } from '../../services/logo'

/** Phones and tablets, where "Upload" opens the system photo picker. */
const touchScreen = () => window.matchMedia?.('(pointer: coarse)').matches ?? false

type ImagePickerProps = {
  /** e.g. "Upload logo" or "Replace". */
  label: string
  busy: boolean
  disabled?: boolean
  /** Id of the visible label the file inputs are named by. */
  labelledBy: string
  onFile: (file: File) => void
  testId?: string
}

/**
 * An upload button for images. On phones there's also "Choose from Files": Android's photo
 * picker sometimes can't load photos kept in the cloud ("Can't load some photos"), and the
 * file browser doesn't have that problem.
 */
export function ImagePicker({
  label,
  busy,
  disabled,
  labelledBy,
  onFile,
  testId,
}: ImagePickerProps) {
  const photos = useRef<HTMLInputElement>(null)
  const files = useRef<HTMLInputElement>(null)
  const [touch] = useState(touchScreen)

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) onFile(file)
  }

  return (
    <>
      <Button size="sm" onClick={() => photos.current?.click()} disabled={busy || disabled}>
        <ImagePlus />
        {busy ? 'Processing…' : label}
      </Button>
      {touch && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => files.current?.click()}
          disabled={busy || disabled}
        >
          <FolderOpen />
          From Files
        </Button>
      )}
      <input
        ref={photos}
        type="file"
        accept={ACCEPTED_LOGO_TYPES.join(',')}
        className="hidden"
        onChange={choose}
        aria-labelledby={labelledBy}
        data-testid={testId}
      />
      {/* No accept filter, so Android opens its file browser instead of the photo picker. */}
      <input
        ref={files}
        type="file"
        className="hidden"
        onChange={choose}
        aria-labelledby={labelledBy}
        tabIndex={-1}
      />
    </>
  )
}
