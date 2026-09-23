import { ArrowDown, ArrowUp, Copy, Percent, Trash2, X } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { DecimalField } from '../../../components/ui/DecimalField'
import { TextField } from '../../../components/ui/Field'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import type { LineItem } from '../../../domain/schema'
import { validateMoney, validatePercent, validateQuantity } from '../validators'

const DISCOUNT_TYPES = [
  { value: 'percent', label: '%', ariaLabel: 'Percentage' },
  { value: 'fixed', label: 'Amount' },
] as const

type LineItemRowProps = {
  item: LineItem
  index: number
  count: number
  locale: string
  /** Formatted line total. */
  amount: string
  /** Tax and total with tax, when the invoice shows tax on each line. */
  lineTax?: { label: string; tax: string; total: string }
  /** The id of the list of common units, for suggestions. */
  unitListId: string
  /** What the item code is called where the law asks for one (e.g. "HSN/SAC"); else empty. */
  codeLabel: string
  autoFocus: boolean
  onChange: (patch: Partial<LineItem>) => void
  onMove: (direction: -1 | 1) => void
  onDuplicate: () => void
  onRemove: () => void
  /** Enter pressed in a field: the section adds a new line if this is the last one. */
  onEnter: () => void
}

export function LineItemRow({
  item,
  index,
  count,
  locale,
  amount,
  lineTax,
  unitListId,
  codeLabel,
  autoFocus,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
  onEnter,
}: LineItemRowProps) {
  const label = `Item ${index + 1}`
  const hasDiscount = item.discount.type !== 'none'
  const enterAddsLine = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault()
      onEnter()
    }
  }

  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">
          {label}
        </span>
        <div className="-my-1 flex">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Move ${label} up`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Move ${label} down`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Duplicate ${label}`}
            onClick={onDuplicate}
          >
            <Copy />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${label}`} onClick={onRemove}>
            <Trash2 />
          </Button>
        </div>
      </div>

      <TextField
        label="Description"
        placeholder="Website design"
        value={item.description}
        autoFocus={autoFocus}
        onChange={(e) => onChange({ description: e.target.value })}
        onKeyDown={enterAddsLine}
      />
      {(codeLabel || item.code) && (
        <TextField
          label={codeLabel || 'Item code'}
          optional={!codeLabel}
          spellCheck={false}
          value={item.code}
          onChange={(e) => onChange({ code: e.target.value })}
          onKeyDown={enterAddsLine}
        />
      )}
      <div className="grid grid-cols-2 gap-2 min-[28rem]:grid-cols-[0.9fr_1fr_1.3fr_0.9fr]">
        <DecimalField
          label="Qty"
          locale={locale}
          value={item.quantity}
          validate={validateQuantity}
          onCommit={(quantity) => onChange({ quantity })}
          onKeyDown={enterAddsLine}
        />
        <TextField
          label="Unit"
          placeholder="Pcs"
          list={unitListId}
          autoComplete="off"
          value={item.unit}
          onChange={(e) => onChange({ unit: e.target.value })}
          onKeyDown={enterAddsLine}
        />
        <DecimalField
          label="Unit price"
          placeholder="0"
          locale={locale}
          value={item.unitPrice}
          validate={validateMoney}
          onCommit={(unitPrice) => onChange({ unitPrice })}
          onKeyDown={enterAddsLine}
        />
        <DecimalField
          label="Tax %"
          placeholder="0"
          locale={locale}
          value={item.taxRate}
          validate={validatePercent}
          onCommit={(taxRate) => onChange({ taxRate })}
          onKeyDown={enterAddsLine}
        />
      </div>

      {hasDiscount && (
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg-muted">Discount</span>
            <SegmentedControl
              label={`${label} discount type`}
              size="sm"
              options={DISCOUNT_TYPES}
              value={item.discount.type === 'fixed' ? 'fixed' : 'percent'}
              onChange={(type) => onChange({ discount: { type, value: '' } })}
              className="h-11 items-center"
            />
          </div>
          <DecimalField
            label={item.discount.type === 'percent' ? 'Percent off' : 'Amount off'}
            className="flex-1"
            locale={locale}
            value={item.discount.value}
            validate={item.discount.type === 'percent' ? validatePercent : validateMoney}
            onCommit={(value) => onChange({ discount: { ...item.discount, value } })}
            onKeyDown={enterAddsLine}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ${label} discount`}
            onClick={() => onChange({ discount: { type: 'none', value: '' } })}
          >
            <X />
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line pt-2.5">
        {hasDiscount ? (
          <span />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 px-3"
            onClick={() => onChange({ discount: { type: 'percent', value: '' } })}
          >
            <Percent />
            Add discount
          </Button>
        )}
        <span className="flex flex-wrap justify-end gap-x-3 text-sm">
          <span>
            <span className="text-fg-subtle">Amount </span>
            <span className={lineTax ? 'tabular-nums' : 'font-display font-semibold tabular-nums'}>
              {amount}
            </span>
          </span>
          {lineTax && (
            <>
              <span>
                <span className="text-fg-subtle">{lineTax.label} </span>
                <span className="tabular-nums">{lineTax.tax}</span>
              </span>
              <span>
                <span className="text-fg-subtle">Total </span>
                <span className="font-display font-semibold tabular-nums">{lineTax.total}</span>
              </span>
            </>
          )}
        </span>
      </div>
    </div>
  )
}
