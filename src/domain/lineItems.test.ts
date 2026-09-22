import { describe, expect, it } from 'vitest'
import { createLineItem } from './draft'
import {
  addLineItem,
  duplicateLineItem,
  moveLineItem,
  removeLineItem,
  updateLineItem,
} from './lineItems'
import { createSampleInvoice } from './sample'

const ids = (invoice: { items: { id: string }[] }) => invoice.items.map((item) => item.id)
const sample = () => createSampleInvoice() // items: item-1, item-2, item-3

describe('line item edits', () => {
  it('adds to the end', () => {
    expect(ids(addLineItem(sample(), createLineItem('new')))).toEqual([
      'item-1',
      'item-2',
      'item-3',
      'new',
    ])
  })

  it('updates one item, keeps its id, and leaves the others as they were', () => {
    const original = sample()
    const invoice = updateLineItem(original, 'item-2', { quantity: '3', id: 'ignored' })
    expect(invoice.items[1]).toMatchObject({ id: 'item-2', quantity: '3' })
    expect(invoice.items[0]).toBe(original.items[0])
  })

  it('duplicates directly below, as an independent copy', () => {
    const original = sample()
    const invoice = duplicateLineItem(original, 'item-1', 'copy')
    expect(ids(invoice)).toEqual(['item-1', 'copy', 'item-2', 'item-3'])
    expect(invoice.items[1]).toEqual({ ...original.items[0], id: 'copy' })
    invoice.items[1].discount.value = 'changed'
    expect(original.items[0].discount.value).toBe('')
  })

  it('ignores unknown ids', () => {
    const invoice = sample()
    expect(duplicateLineItem(invoice, 'nope', 'copy')).toBe(invoice)
    expect(moveLineItem(invoice, 'nope', 1)).toBe(invoice)
  })

  it('removes an item', () => {
    expect(ids(removeLineItem(sample(), 'item-2'))).toEqual(['item-1', 'item-3'])
  })

  it('moves up and down, and stops at the ends', () => {
    const invoice = sample()
    expect(ids(moveLineItem(invoice, 'item-2', -1))).toEqual(['item-2', 'item-1', 'item-3'])
    expect(ids(moveLineItem(invoice, 'item-2', 1))).toEqual(['item-1', 'item-3', 'item-2'])
    expect(moveLineItem(invoice, 'item-1', -1)).toBe(invoice)
    expect(moveLineItem(invoice, 'item-3', 1)).toBe(invoice)
  })

  it('never mutates the original', () => {
    const invoice = sample()
    const before = structuredClone(invoice)
    addLineItem(invoice, createLineItem('x'))
    updateLineItem(invoice, 'item-1', { quantity: '9' })
    duplicateLineItem(invoice, 'item-1', 'y')
    removeLineItem(invoice, 'item-1')
    moveLineItem(invoice, 'item-1', 1)
    expect(invoice).toEqual(before)
  })
})
