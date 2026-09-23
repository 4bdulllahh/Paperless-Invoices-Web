import type { Invoice } from './schema'

/**
 * A realistic invoice for tests, template development and the "Try with sample data" option.
 * Expected totals (USD, 8.875% sales tax, 10% invoice discount):
 *   lines 2400.00 + 1800.00 + 135.00 = 4335.00, discount 433.50, tax 346.26, total 4247.76,
 *   paid 1000.00, balance due 3247.76.
 */
export function createSampleInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'sample-invoice',
    number: 'INV-2026-0042',
    issueDate: '2026-09-23',
    dueDate: '2026-10-07',
    currency: 'USD',
    locale: 'en-US',
    taxMode: 'exclusive',
    taxLabel: 'Sales tax',
    from: {
      name: 'Acme Studio',
      email: 'hello@acme.studio',
      phone: '+1 555 0100',
      address: '12 Harbour Street\nBrooklyn, NY 11201\nUnited States',
      taxId: '12-3456789',
    },
    to: {
      name: 'Northwind Ltd',
      email: 'accounts@northwind.com',
      phone: '',
      address: '400 Market Street\nSan Francisco, CA 94105',
      taxId: '',
    },
    items: [
      {
        id: 'item-1',
        description: 'Website design',
        quantity: '1',
        unitPrice: '2400',
        taxRate: '8.875',
        discount: { type: 'none', value: '' },
        unit: '',
        code: '',
      },
      {
        id: 'item-2',
        description: 'Frontend development (hours)',
        quantity: '24',
        unitPrice: '75',
        taxRate: '8.875',
        discount: { type: 'none', value: '' },
        unit: '',
        code: '',
      },
      {
        id: 'item-3',
        description: 'Hosting setup',
        quantity: '1',
        unitPrice: '150',
        taxRate: '8.875',
        discount: { type: 'percent', value: '10' },
        unit: '',
        code: '',
      },
    ],
    discount: { type: 'percent', value: '10' },
    amountPaid: '1000',
    notes: 'Thank you for your business!',
    templateId: 'modern',
    title: 'Invoice',
    taxIdLabel: 'EIN',
    amountInWords: false,
    country: 'US',
    poNumber: '',
    supplyDate: '',
    dueMode: 'date',
    paymentTermsDays: 14,
    payment: null,
    signed: false,
    showLineTax: false,
    ...overrides,
  }
}
