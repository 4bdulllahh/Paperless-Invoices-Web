import { Check, Eraser, X } from 'lucide-react'
import { useRef, useState, type PointerEvent } from 'react'
import { Button } from '../../components/ui/Button'
import type { Logo } from '../../domain/records'
import { LogoError, trimmedPng } from '../../services/logo'

/** Drawing size in canvas pixels; shown at the pad's width, so it stays sharp on phones. */
const WIDTH = 900
const HEIGHT = 300
/** Dark blue, like a pen. */
const INK = '#1f2f6b'

type SignaturePadProps = {
  onSave: (signature: Logo) => void
  onCancel: () => void
}

/** Sign with a finger, pen or mouse. The drawing is cropped to the ink and saved as a PNG. */
export function SignaturePad({ onSave, onCancel }: SignaturePadProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const last = useRef<{ x: number; y: number } | null>(null)
  const [drawn, setDrawn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    return {
      x: ((event.clientX - box.left) / box.width) * WIDTH,
      y: ((event.clientY - box.top) / box.height) * HEIGHT,
    }
  }

  function stroke(to: { x: number; y: number }) {
    const context = canvas.current?.getContext('2d')
    if (!context) return
    const from = last.current ?? to
    context.strokeStyle = INK
    context.lineWidth = 5
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    context.moveTo(from.x, from.y)
    context.lineTo(to.x + (from === to ? 0.1 : 0), to.y)
    context.stroke()
    last.current = to
    setDrawn(true)
  }

  function clear() {
    canvas.current?.getContext('2d')?.clearRect(0, 0, WIDTH, HEIGHT)
    setDrawn(false)
    setError(null)
  }

  async function save() {
    if (!canvas.current) return
    try {
      onSave(await trimmedPng(canvas.current))
    } catch (problem) {
      setError(problem instanceof LogoError ? problem.message : 'The signature couldn’t be saved.')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        aria-label="Signature pad: draw your signature here"
        className="aspect-[3/1] w-full max-w-md cursor-crosshair touch-none rounded-lg border border-line-strong bg-white"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId)
          last.current = null
          stroke(point(event))
        }}
        onPointerMove={(event) => {
          if (last.current) stroke(point(event))
        }}
        onPointerUp={() => (last.current = null)}
        onPointerCancel={() => (last.current = null)}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="primary" onClick={() => void save()} disabled={!drawn}>
          <Check />
          Use signature
        </Button>
        <Button size="sm" variant="ghost" onClick={clear} disabled={!drawn}>
          <Eraser />
          Clear
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X />
          Cancel
        </Button>
      </div>
      <p role="status" className="text-xs font-medium text-fg empty:hidden">
        {error}
      </p>
    </div>
  )
}
