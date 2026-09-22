import { LoaderCircle, TriangleAlert } from 'lucide-react'
import { CraneMark } from '../../components/brand/CraneMark'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import type { TemplateId } from '../../domain/schema'
import { cn } from '../../lib/cn'
import { useDraftStore } from '../../storage/stores'
import { useLivePdfPreview } from './useLivePdfPreview'

const TEMPLATE_OPTIONS = [
  { value: 'modern', label: 'Modern' },
  { value: 'classic', label: 'Classic' },
  { value: 'minimal', label: 'Minimal' },
] as const

/** Each page is scaled so a whole A4 page fits the pane; longer invoices scroll page by page. */
const PAGE_SIZE = 'w-[min(100cqw,calc(100cqh*210/297))]'

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
  const { pages, status } = useLivePdfPreview()

  return (
    <Card className={cn('flex min-h-0 flex-col overflow-hidden', className)}>
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
        <SegmentedControl
          label="Invoice template"
          options={TEMPLATE_OPTIONS}
          value={template}
          onChange={setTemplate}
          size="sm"
        />
      </div>

      <div
        aria-busy={status === 'loading' || status === 'updating'}
        className="[container-type:size] min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface-sunken p-4 sm:p-6"
      >
        {status === 'error' && (
          <p className="mx-auto mb-4 flex max-w-sm items-center gap-2 rounded-md bg-accent-soft px-3 py-2 text-sm">
            <TriangleAlert className="size-4 shrink-0 text-accent" aria-hidden="true" />
            The preview couldn’t be drawn. Your invoice is still saved; try editing it again.
          </p>
        )}
        <div className="flex flex-col items-center gap-4">
          {pages ? (
            pages.map((page, index) => (
              <img
                key={page.url}
                src={page.url}
                width={page.width}
                height={page.height}
                alt={`Invoice ${number}, page ${index + 1} of ${pages.length}`}
                className={cn(
                  PAGE_SIZE,
                  'h-auto rounded-sm bg-white shadow-elev-2 ring-1 ring-ink/5 dark:ring-cream/15',
                )}
              />
            ))
          ) : (
            <SkeletonPage template={template} />
          )}
        </div>
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

function SkeletonPage({ template }: { template: TemplateId }) {
  const modern = template === 'modern'
  const classic = template === 'classic'

  return (
    <div
      role="img"
      aria-label="Loading preview"
      className={cn(
        PAGE_SIZE,
        '@container aspect-[210/297] animate-pulse overflow-hidden rounded-sm bg-white text-ink shadow-elev-2 ring-1 ring-ink/5 dark:ring-cream/15',
      )}
    >
      <div
        className={cn(
          'flex items-start justify-between p-[7cqw]',
          modern && 'bg-ink text-cream',
          classic &&
            'flex-col items-center gap-[2cqw] border-b-[0.6cqw] border-double border-ink/25 pb-[5cqw] text-center',
        )}
      >
        <div className={cn('flex items-center gap-[2cqw]', classic && 'flex-col')}>
          <CraneMark className={cn('w-[11cqw]', modern && 'text-flame')} strokeWidth={1} />
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

      <div className="flex flex-col gap-[6cqw] px-[7cqw] pt-[6cqw]">
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
          <div className="grid size-[16cqw] place-items-center rounded-[1cqw] border-[0.3cqw] border-dashed border-[#d6d0c4] text-[2cqw] text-[#a39c91]">
            QR
          </div>
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
                modern ? 'bg-flame' : 'border-t-[0.4cqw] border-ink px-0',
              )}
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
