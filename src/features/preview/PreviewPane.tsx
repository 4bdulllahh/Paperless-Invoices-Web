import {
  ChevronDown,
  LoaderCircle,
  Maximize2,
  MoveHorizontal,
  TriangleAlert,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useRef } from 'react'
import { CraneMark } from '../../components/brand/CraneMark'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ColorPicker } from '../../components/ui/ColorPicker'
import { DEFAULT_ACCENT } from '../../domain/colors'
import { TEMPLATE_OPTIONS } from '../../domain/options'
import type { TemplateId } from '../../domain/schema'
import { cn } from '../../lib/cn'
import { useDraftStore } from '../../storage/stores'
import { useLivePdfPreview } from './useLivePdfPreview'
import { MAX_ZOOM, MIN_ZOOM, usePreviewZoom } from './usePreviewZoom'

/**
 * The real PDF, redrawn as the invoice changes: exactly what will be downloaded.
 * A stand-in page shows while the PDF engine loads for the first time.
 */
export function PreviewPane({ className }: { className?: string }) {
  // The template belongs to the invoice (new invoices start with the default from Settings).
  const template = useDraftStore((state) => state.invoice?.templateId ?? 'modern')
  const number = useDraftStore((state) => state.invoice?.number ?? '')
  const updateInvoice = useDraftStore((state) => state.updateInvoice)
  const setTemplate = (templateId: TemplateId) =>
    updateInvoice((invoice) => ({ ...invoice, templateId }))
  // So is the colour; new invoices start with the one chosen in Settings.
  const accent = useDraftStore((state) => state.invoice?.accentColor ?? DEFAULT_ACCENT)
  const setAccent = (accentColor: string) =>
    updateInvoice((invoice) => ({ ...invoice, accentColor }))
  const pane = useRef<HTMLDivElement>(null)
  const zoom = usePreviewZoom(pane)
  const { pages, status, retry } = useLivePdfPreview(zoom.resolution)

  return (
    <Card className={cn('relative flex min-h-0 flex-col overflow-hidden', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold tracking-tight">Preview</h2>
          <Badge>A4{pages && pages.length > 1 ? ` · ${pages.length} pages` : ''}</Badge>
          <span
            role="status"
            className={cn(
              'flex items-center gap-1 text-xs text-fg-subtle transition-opacity duration-300',
              status === 'updating' || status === 'loading' ? 'opacity-100' : 'opacity-0',
            )}
          >
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
            {status === 'loading' ? 'Preparing preview…' : 'Updating…'}
          </span>
        </div>
        {/* Stays at the right when it wraps, so the colour panel opens inside the pane. */}
        <div className="ml-auto flex items-center gap-2">
          <label className="relative flex items-center">
            <span className="sr-only">Invoice template</span>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as TemplateId)}
              className="h-9 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface pr-9 pl-4 text-sm font-medium text-fg hover:bg-surface-muted focus:border-accent focus:outline-none"
            >
              {TEMPLATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 size-4 text-fg-subtle"
              aria-hidden="true"
            />
          </label>
          <ColorPicker label="PDF colour" value={accent} onChange={setAccent} />
        </div>
      </div>

      <div
        ref={pane}
        // Focusable, so keyboard users can scroll a zoomed-in page with the arrow keys.
        tabIndex={0}
        role="region"
        aria-label="Invoice preview"
        aria-busy={status === 'loading' || status === 'updating'}
        // Pinch-zooming is handled here, so the browser only pans.
        style={{ touchAction: 'pan-x pan-y' }}
        className="[container-type:size] min-h-0 flex-1 overflow-auto overscroll-contain bg-surface-sunken p-4 pb-20 sm:p-6 sm:pb-20"
      >
        {status === 'error' && (
          <div
            role="alert"
            className="mx-auto mb-4 flex max-w-md items-center gap-3 rounded-md bg-accent-soft px-3 py-2 text-sm"
          >
            <TriangleAlert className="size-4 shrink-0 text-accent" aria-hidden="true" />
            <p className="flex-1">The preview couldn’t be drawn. Your invoice is still saved.</p>
            <Button size="sm" variant="ghost" className="-my-1 h-8 px-3" onClick={retry}>
              Try again
            </Button>
          </div>
        )}
        {/* At least as wide as the pane (centred), wider when zoomed in (scrolls sideways). */}
        <div className="mx-auto flex w-fit min-w-full flex-col items-center gap-4">
          {pages ? (
            pages.map((page, index) => (
              <img
                key={page.url}
                src={page.url}
                width={page.width}
                height={page.height}
                alt={`Invoice ${number}, page ${index + 1} of ${pages.length}`}
                style={{ width: zoom.pageWidth }}
                className="h-auto max-w-none rounded-sm bg-white shadow-elev-2 ring-1 ring-ink/5 dark:ring-cream/15"
              />
            ))
          ) : (
            <SkeletonPage template={template} accent={accent} width={zoom.pageWidth} />
          )}
        </div>
      </div>

      <div
        role="toolbar"
        aria-label="Zoom"
        className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-line bg-surface/95 p-1 shadow-elev-2 backdrop-blur-sm"
      >
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Zoom out"
          title="Zoom out (Ctrl + scroll)"
          disabled={zoom.zoom <= MIN_ZOOM + 0.01}
          onClick={zoom.zoomOut}
        >
          <ZoomOut />
        </Button>
        <button
          type="button"
          onClick={zoom.fitWidth}
          title="Fit to width"
          aria-label={`Zoom ${Math.round(zoom.zoom * 100)}%, fit to width`}
          className="h-8 min-w-14 cursor-pointer rounded-full px-2 text-sm font-medium text-fg tabular-nums hover:bg-surface-muted"
        >
          {Math.round(zoom.zoom * 100)}%
        </button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Zoom in"
          title="Zoom in (Ctrl + scroll)"
          disabled={zoom.zoom >= MAX_ZOOM - 0.01}
          onClick={zoom.zoomIn}
        >
          <ZoomIn />
        </Button>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        <Button
          size="icon-sm"
          variant="ghost"
          aria-pressed={zoom.fitPage}
          aria-label={zoom.fitPage ? 'Fit to width' : 'Fit whole page'}
          title={zoom.fitPage ? 'Fit to width' : 'Fit whole page'}
          onClick={zoom.toggleFitPage}
        >
          {zoom.fitPage ? <MoveHorizontal /> : <Maximize2 />}
        </Button>
      </div>
    </Card>
  )
}

/** Grey bar standing in for a line of text; sizes are relative to the page width. */
function Bar({ w, className }: { w: string; className?: string }) {
  return (
    <div className={cn('h-[1.5cqw] rounded-full bg-[#e8e3d8]', className)} style={{ width: w }} />
  )
}

function SkeletonPage({
  template,
  accent,
  width,
}: {
  template: TemplateId
  accent: string
  width: string
}) {
  const modern = template === 'modern'
  const classic = template === 'classic'

  return (
    <div
      role="img"
      aria-label="Loading preview"
      style={{ width }}
      className={cn(
        '@container aspect-[210/297] animate-pulse overflow-hidden rounded-sm bg-white text-ink shadow-elev-2 ring-1 ring-ink/5 dark:ring-cream/15',
      )}
    >
      {/* A sketch of the page: decorative, the label says what it is. */}
      <div
        aria-hidden="true"
        className={cn(
          'flex items-start justify-between p-[7cqw]',
          modern && 'bg-ink text-cream',
          classic &&
            'flex-col items-center gap-[2cqw] border-b-[0.6cqw] border-double border-ink/25 pb-[5cqw] text-center',
        )}
      >
        <div className={cn('flex items-center gap-[2cqw]', classic && 'flex-col')}>
          <CraneMark
            className="w-[11cqw]"
            style={modern ? { color: accent } : undefined}
            strokeWidth={1}
          />
          {!classic && <Bar w="18cqw" className={modern ? 'bg-cream/25' : undefined} />}
        </div>
        <div className={cn('flex flex-col items-end gap-[1.5cqw]', classic && 'items-center')}>
          <span
            className={cn(
              'font-display text-[5cqw] leading-none font-semibold tracking-tight',
              classic && 'font-serif tracking-[0.2em] uppercase',
              template === 'minimal' &&
                'font-sans text-[4cqw] font-normal tracking-[0.3em] uppercase',
            )}
          >
            Invoice
          </span>
          <Bar w="16cqw" className={modern ? 'bg-cream/25' : undefined} />
        </div>
      </div>

      <div aria-hidden="true" className="flex flex-col gap-[6cqw] px-[7cqw] pt-[6cqw]">
        <div className="grid grid-cols-2 gap-[6cqw]">
          {[0, 1].map((col) => (
            <div key={col} className="flex flex-col gap-[1.8cqw]">
              <Bar w="10cqw" className="bg-[#d6d0c4]" />
              <Bar w="28cqw" />
              <Bar w="22cqw" />
              <Bar w="25cqw" />
            </div>
          ))}
        </div>

        <div className="flex flex-col">
          <div
            className={cn(
              'flex justify-between py-[2cqw]',
              modern ? 'rounded-[1cqw] bg-cream px-[2cqw]' : 'border-b-[0.3cqw] border-ink/80',
            )}
          >
            <Bar w="20cqw" className="bg-[#d6d0c4]" />
            <Bar w="12cqw" className="bg-[#d6d0c4]" />
          </div>
          {['40cqw', '32cqw', '46cqw', '28cqw'].map((w) => (
            <div
              key={w}
              className={cn(
                'flex justify-between border-b-[0.2cqw] border-[#eee9df] py-[2.4cqw]',
                modern && 'px-[2cqw]',
              )}
            >
              <Bar w={w} />
              <Bar w="10cqw" />
            </div>
          ))}
        </div>

        <div className="flex items-end justify-between">
          <div className="grid size-[16cqw] place-items-center rounded-[1cqw] border-[0.3cqw] border-dashed border-[#d6d0c4]" />
          <div className="flex w-[40cqw] flex-col gap-[1.8cqw]">
            <div className="flex justify-between">
              <Bar w="14cqw" />
              <Bar w="10cqw" />
            </div>
            <div className="flex justify-between">
              <Bar w="10cqw" />
              <Bar w="8cqw" />
            </div>
            <div
              className={cn(
                'mt-[1cqw] flex items-center justify-between rounded-[1.2cqw] p-[2.2cqw]',
                !modern && 'border-t-[0.4cqw] border-ink px-0',
              )}
              style={modern ? { backgroundColor: accent } : undefined}
            >
              <Bar w="12cqw" className={modern ? 'bg-ink/30' : 'bg-[#d6d0c4]'} />
              <Bar w="14cqw" className={modern ? 'bg-ink/50' : 'bg-ink/60'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
