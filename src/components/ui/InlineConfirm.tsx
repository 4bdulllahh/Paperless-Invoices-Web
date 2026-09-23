import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { flushSync } from 'react-dom'
import { cn } from '../../lib/cn'
import { Button } from './Button'

type InlineConfirmProps = {
  /** The question, e.g. "Delete INV-2026-0042? This can't be undone." */
  children: ReactNode
  confirmLabel: ReactNode
  onConfirm: () => void
  onCancel: () => void
  cancelLabel?: string
  /** Danger for anything that deletes or discards work. */
  tone?: 'danger' | 'primary'
  /** The control that asked the question. Focus goes back to it when the user cancels. */
  returnFocus?: RefObject<HTMLElement | null>
  className?: string
}

/**
 * A question shown in place, instead of a pop-up. The safe choice (Cancel) is focused, so an
 * accidental Enter does nothing harmful; Escape cancels.
 */
export function InlineConfirm({
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  returnFocus,
  className,
}: InlineConfirmProps) {
  const messageId = useId()
  const cancelButton = useRef<HTMLButtonElement>(null)

  useEffect(() => cancelButton.current?.focus(), [])

  function cancel() {
    // Render the control that asked first, so focus can go back to it.
    flushSync(onCancel)
    returnFocus?.current?.focus()
  }

  return (
    <div
      role="alertdialog"
      aria-labelledby={messageId}
      className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 text-sm', className)}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        e.stopPropagation()
        cancel()
      }}
    >
      <div id={messageId} className="min-w-0 flex-1 basis-60">
        {children}
      </div>
      <div className="flex gap-1.5">
        <Button size="sm" variant={tone} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button ref={cancelButton} size="sm" variant="ghost" onClick={cancel}>
          {cancelLabel}
        </Button>
      </div>
    </div>
  )
}
