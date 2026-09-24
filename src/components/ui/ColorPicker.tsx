import { Check, ChevronDown, X } from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  ACCENT_PRESETS,
  hexToHsv,
  hsvToHex,
  normaliseHex,
  pdfTheme,
  type Hsv,
} from '../../domain/colors'
import { cn } from '../../lib/cn'
import { Button } from './Button'

type ColorPickerProps = {
  value: string
  onChange: (color: string) => void
  /** Names the button for screen readers, e.g. "PDF colour". */
  label: string
  /** Which edge of the button the panel lines up with. */
  align?: 'left' | 'right'
  className?: string
}

const clamp = (n: number) => Math.min(1, Math.max(0, n))
const presetName = (color: string) => ACCENT_PRESETS.find((p) => p.value === color)?.name

/**
 * The PDF's theme colour: a swatch button that opens a panel with ready-made colours, a
 * saturation and brightness square, a hue slider and a hex field. A sample shows the text colour
 * the PDF will print on it, which switches between dark and white to stay readable.
 */
export function ColorPicker({
  value,
  onChange,
  label,
  align = 'right',
  className,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const name = presetName(value) ?? value.toUpperCase()

  useEffect(() => {
    if (!open) return
    panel.current?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    const onPointer = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <div ref={wrapper} className={cn('relative', className)}>
      <button
        ref={button}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${name}`}
        title={label}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface pr-3 pl-1.5 text-sm font-medium text-fg hover:bg-surface-muted"
      >
        <span
          aria-hidden="true"
          className="size-6 rounded-full ring-1 ring-ink/15 ring-inset dark:ring-cream/25"
          style={{ backgroundColor: value }}
        />
        <span className="hidden sm:inline">Colour</span>
        <ChevronDown
          className={cn('size-4 text-fg-subtle transition', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          ref={panel}
          role="dialog"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={cn(
            'absolute top-full z-30 mt-2 flex w-[min(18.5rem,calc(100vw-2.5rem))] flex-col gap-4 rounded-lg border border-line bg-surface p-4 text-sm shadow-elev-2 focus:outline-none',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p id={titleId} className="font-display font-semibold">
                {label}
              </p>
              <p className="text-xs text-fg-subtle">Headers, highlights and the balance due.</p>
            </div>
            <Button
              size="icon-sm"
              variant="ghost"
              className="-mt-1 -mr-1"
              aria-label="Close"
              onClick={() => {
                setOpen(false)
                button.current?.focus()
              }}
            >
              <X />
            </Button>
          </div>
          <ColorPanel value={value} onChange={onChange} />
        </div>
      )}
    </div>
  )
}

function ColorPanel({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  // Hue and saturation are kept here too: white, black and greys have no hue of their own, and
  // the square would jump if it were worked out from the hex each time.
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value))
  const [hex, setHex] = useState(value)
  const [draft, setDraft] = useState(value.slice(1).toUpperCase())
  const [seen, setSeen] = useState(value)
  const theme = pdfTheme(hex)

  // Follow a colour changed elsewhere, e.g. in Settings in another tab.
  if (value !== seen) {
    setSeen(value)
    if (value !== hex) {
      setHsv(hexToHsv(value))
      setHex(value)
      setDraft(value.slice(1).toUpperCase())
    }
  }

  function pick(next: Hsv, commit: boolean) {
    const color = hsvToHex(next)
    setHsv(next)
    setHex(color)
    setDraft(color.slice(1).toUpperCase())
    if (commit) onChange(color)
  }

  function choose(color: string) {
    setHsv(hexToHsv(color))
    setHex(color)
    setDraft(color.slice(1).toUpperCase())
    onChange(color)
  }

  return (
    <>
      <div className="grid grid-cols-6 gap-2" role="group" aria-label="Ready-made colours">
        {ACCENT_PRESETS.map((preset) => {
          const selected = preset.value === hex
          return (
            <button
              key={preset.value}
              type="button"
              aria-label={preset.name}
              aria-pressed={selected}
              title={preset.name}
              onClick={() => choose(preset.value)}
              className={cn(
                'grid aspect-square cursor-pointer place-items-center rounded-full ring-offset-2 ring-offset-surface transition hover:scale-110',
                selected ? 'ring-2 ring-fg' : 'ring-1 ring-ink/10 ring-inset dark:ring-cream/20',
              )}
              style={{ backgroundColor: preset.value }}
            >
              {selected && (
                <Check
                  className="size-4"
                  strokeWidth={3}
                  style={{ color: pdfTheme(preset.value).onAccent }}
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium tracking-wide text-fg-subtle uppercase">Your own</span>
        <SaturationSquare hsv={hsv} onChange={pick} />
        <HueSlider hsv={hsv} onChange={pick} />
        <div className="flex items-center gap-2">
          <div className="relative flex min-w-0 flex-1 items-center">
            <span aria-hidden="true" className="pointer-events-none absolute left-3 text-fg-subtle">
              #
            </span>
            <input
              aria-label="Hex colour"
              value={draft}
              maxLength={7}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => {
                setDraft(e.target.value.replace('#', '').toUpperCase())
                const color = normaliseHex(e.target.value)
                if (color && color !== hex && e.target.value.replace('#', '').length === 6) {
                  choose(color)
                }
              }}
              onBlur={() => {
                const color = normaliseHex(draft)
                if (color) choose(color)
                else setDraft(hex.slice(1).toUpperCase())
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              className="h-9 w-full rounded-full border border-line-strong bg-surface-muted pr-3 pl-6 font-mono text-sm text-fg uppercase focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15 focus:outline-none"
            />
          </div>
          <span
            className="flex h-9 shrink-0 items-center rounded-full px-3.5 text-xs font-semibold"
            style={{ backgroundColor: hex, color: theme.onAccent }}
            title="Text printed on this colour"
          >
            Balance due
          </span>
        </div>
      </div>
    </>
  )
}

type DragHandler = (event: ReactPointerEvent<HTMLDivElement>, commit: boolean) => void

/** Pointer handlers that follow a drag, committing the colour when it ends. */
function dragHandlers(onMove: DragHandler) {
  return {
    onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
      event.currentTarget.setPointerCapture?.(event.pointerId)
      onMove(event, false)
    },
    onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) onMove(event, false)
    },
    onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
      onMove(event, true)
    },
  }
}

const position = (event: ReactPointerEvent<HTMLDivElement>) => {
  const box = event.currentTarget.getBoundingClientRect()
  return {
    x: clamp((event.clientX - box.left) / (box.width || 1)),
    y: clamp((event.clientY - box.top) / (box.height || 1)),
  }
}

/** Arrow keys move by 1%, or 10% with Shift. */
const keyStep = (event: KeyboardEvent) => (event.shiftKey ? 0.1 : 0.01)

function SaturationSquare({
  hsv,
  onChange,
}: {
  hsv: Hsv
  onChange: (hsv: Hsv, commit: boolean) => void
}) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = keyStep(event)
    const move = {
      ArrowLeft: { s: -step, v: 0 },
      ArrowRight: { s: step, v: 0 },
      ArrowDown: { s: 0, v: -step },
      ArrowUp: { s: 0, v: step },
    }[event.key]
    if (!move) return
    event.preventDefault()
    onChange({ ...hsv, s: clamp(hsv.s + move.s), v: clamp(hsv.v + move.v) }, true)
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Saturation and brightness"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(hsv.s * 100)}
      aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
      onKeyDown={onKeyDown}
      {...dragHandlers((event, commit) => {
        const { x, y } = position(event)
        onChange({ ...hsv, s: x, v: 1 - y }, commit)
      })}
      className="relative h-32 cursor-crosshair touch-none rounded-md"
      style={{
        backgroundColor: hsvToHex({ h: hsv.h, s: 1, v: 1 }),
        backgroundImage:
          'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.35),0_2px_6px_rgb(0_0_0/0.3)]"
        style={{
          left: `${hsv.s * 100}%`,
          top: `${(1 - hsv.v) * 100}%`,
          backgroundColor: hsvToHex(hsv),
        }}
      />
    </div>
  )
}

function HueSlider({ hsv, onChange }: { hsv: Hsv; onChange: (hsv: Hsv, commit: boolean) => void }) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[event.key]
    if (!step) return
    event.preventDefault()
    const h = (hsv.h + step * (event.shiftKey ? 36 : 4) + 360) % 360
    onChange({ ...hsv, h }, true)
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Hue"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={Math.round(hsv.h)}
      onKeyDown={onKeyDown}
      {...dragHandlers((event, commit) => {
        onChange({ ...hsv, h: Math.min(359.9, position(event).x * 360) }, commit)
      })}
      className="relative h-3.5 cursor-pointer touch-none rounded-full"
      style={{
        backgroundImage:
          'linear-gradient(to right, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00)',
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.35),0_2px_6px_rgb(0_0_0/0.3)]"
        style={{
          left: `${(hsv.h / 360) * 100}%`,
          backgroundColor: hsvToHex({ h: hsv.h, s: 1, v: 1 }),
        }}
      />
    </div>
  )
}
