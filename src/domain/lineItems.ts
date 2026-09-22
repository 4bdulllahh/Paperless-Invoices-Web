import type { Invoice, LineItem } from './schema'

/** Line item edits. Each returns a new invoice and never mutates the one passed in. */

export function addLineItem(invoice: Invoice, item: LineItem): Invoice {
  return { ...invoice, items: [...invoice.items, item] }
}

export function updateLineItem(invoice: Invoice, id: string, patch: Partial<LineItem>): Invoice {
  return {
    ...invoice,
    items: invoice.items.map((item) => (item.id === id ? { ...item, ...patch, id } : item)),
  }
}

/** Insert a copy directly below the original. */
export function duplicateLineItem(invoice: Invoice, id: string, newId: string): Invoice {
  const index = invoice.items.findIndex((item) => item.id === id)
  if (index === -1) return invoice
  const items = [...invoice.items]
  items.splice(index + 1, 0, { ...structuredClone(items[index]), id: newId })
  return { ...invoice, items }
}

export function removeLineItem(invoice: Invoice, id: string): Invoice {
  return { ...invoice, items: invoice.items.filter((item) => item.id !== id) }
}

/** Move up (-1) or down (+1). Does nothing at either end. */
export function moveLineItem(invoice: Invoice, id: string, direction: -1 | 1): Invoice {
  const from = invoice.items.findIndex((item) => item.id === id)
  const to = from + direction
  if (from === -1 || to < 0 || to >= invoice.items.length) return invoice
  const items = [...invoice.items]
  ;[items[from], items[to]] = [items[to], items[from]]
  return { ...invoice, items }
}
