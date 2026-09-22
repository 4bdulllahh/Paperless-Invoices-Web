import { describe, expect, it } from 'vitest'
import {
  bicIssue,
  compactIban,
  formatIban,
  ibanIssue,
  invoicePaymentQr,
  isValidIban,
  paymentQr,
  upiIdIssue,
  type QrInvoice,
} from './paymentQr'
import { emptyPaymentDetails, type PaymentDetails } from './records'
import { createSampleInvoice } from './sample'

const payment = (patch: Partial<PaymentDetails>): PaymentDetails => ({
  ...emptyPaymentDetails(),
  ...patch,
})

const invoice = (patch: Partial<QrInvoice> = {}): QrInvoice => ({
  number: 'INV-2026-0042',
  currency: 'EUR',
  payee: 'Acme Studio',
  balanceDue: 324_776,
  ...patch,
})

const unavailable = (reason: RegExp) => ({
  status: 'unavailable',
  reason: expect.stringMatching(reason),
})

describe('paymentQr', () => {
  it('is off when turned off, or when no link was ever added', () => {
    expect(paymentQr(payment({ qr: 'none', link: 'https://pay.example.com' }), invoice())).toEqual({
      status: 'off',
    })
    expect(paymentQr(payment({ qr: 'link', link: '' }), invoice())).toEqual({ status: 'off' })
  })

  describe('payment link', () => {
    it('encodes the link and says where it goes', () => {
      expect(paymentQr(payment({ link: 'https://pay.example.com/acme' }), invoice())).toEqual({
        status: 'ready',
        qr: {
          payload: 'https://pay.example.com/acme',
          title: 'Scan to pay online',
          detail: 'Opens pay.example.com',
        },
      })
    })

    it('skips links that aren’t links, and invoices with nothing to pay', () => {
      expect(paymentQr(payment({ link: 'pay.example.com' }), invoice())).toEqual(
        unavailable(/full https/),
      )
      expect(
        paymentQr(payment({ link: 'https://pay.example.com' }), invoice({ balanceDue: 0 })),
      ).toEqual(unavailable(/Nothing is left to pay/))
    })
  })

  describe('UPI', () => {
    const upi = payment({ qr: 'upi', upiId: 'acmestudio@okhdfcbank' })
    const rupees = invoice({ currency: 'INR', payee: 'Acme Studio & Co', balanceDue: 1_250_000 })

    it('builds a upi://pay link with the amount and invoice number', () => {
      expect(paymentQr(upi, rupees)).toEqual({
        status: 'ready',
        qr: {
          payload:
            'upi://pay?pa=acmestudio@okhdfcbank&pn=Acme%20Studio%20%26%20Co&am=12500.00&cu=INR&tn=Invoice%20INV-2026-0042',
          title: 'Scan to pay with UPI',
          detail: 'To acmestudio@okhdfcbank, amount filled in',
        },
      })
    })

    it('leaves the note out when the invoice has no number', () => {
      const result = paymentQr(upi, { ...rupees, number: ' ' })
      expect(result).toMatchObject({ qr: { payload: expect.not.stringContaining('tn=') } })
    })

    it('explains what’s missing', () => {
      expect(paymentQr(payment({ qr: 'upi' }), rupees)).toEqual(unavailable(/Add your UPI ID/))
      expect(paymentQr(payment({ qr: 'upi', upiId: 'not an id' }), rupees)).toEqual(
        unavailable(/Add your UPI ID/),
      )
      expect(paymentQr(upi, invoice({ currency: 'USD' }))).toEqual(unavailable(/Indian rupees/))
      expect(paymentQr(upi, { ...rupees, payee: '  ' })).toEqual(unavailable(/business name/))
      expect(paymentQr(upi, { ...rupees, balanceDue: -100 })).toEqual(
        unavailable(/Nothing is left/),
      )
    })

    it('checks UPI IDs', () => {
      expect(upiIdIssue('')).toBeUndefined()
      expect(upiIdIssue(' 9876543210@ybl ')).toBeUndefined()
      expect(upiIdIssue('first.last-1@oksbi')).toBeUndefined()
      expect(upiIdIssue('acme')).toMatch(/UPI ID like/)
      expect(upiIdIssue('acme@')).toMatch(/UPI ID like/)
      expect(upiIdIssue('acme studio@ybl')).toMatch(/UPI ID like/)
    })
  })

  describe('SEPA (EPC QR code)', () => {
    const sepa = payment({ qr: 'sepa', iban: 'de89 3704 0044 0532 0130 00', bic: 'cobadeffxxx' })

    it('follows the EPC standard, line by line', () => {
      expect(paymentQr(sepa, invoice())).toEqual({
        status: 'ready',
        qr: {
          payload: [
            'BCD',
            '002',
            '1',
            'SCT',
            'COBADEFFXXX',
            'Acme Studio',
            'DE89370400440532013000',
            'EUR3247.76',
            '',
            '',
            'Invoice INV-2026-0042',
          ].join('\n'),
          title: 'Scan to pay by bank transfer',
          detail: 'Banking apps fill in the IBAN, amount and reference.',
        },
      })
    })

    it('works without a BIC or an invoice number', () => {
      const result = paymentQr({ ...sepa, bic: '' }, invoice({ number: '' }))
      expect(result).toMatchObject({
        qr: {
          payload: 'BCD\n002\n1\nSCT\n\nAcme Studio\nDE89370400440532013000\nEUR3247.76',
        },
      })
    })

    it('keeps names to one line of 70 characters', () => {
      const result = paymentQr(sepa, invoice({ payee: `Acme\nStudio ${'x'.repeat(100)}` }))
      expect(result.status === 'ready' && result.qr.payload.split('\n')[5]).toBe(
        `Acme Studio ${'x'.repeat(58)}`,
      )
    })

    it('stays within 331 bytes, shortening the reference if it has to', () => {
      const payee = '😀'.repeat(60) // 4 bytes each
      const result = paymentQr(sepa, invoice({ payee, number: 'N'.repeat(100) }))
      expect(result.status).toBe('ready')
      const payload = result.status === 'ready' ? result.qr.payload : ''
      expect(new TextEncoder().encode(payload).length).toBeLessThanOrEqual(331)
      expect(payload).toMatch(/\nInvoice N+$/)

      expect(paymentQr(sepa, invoice({ payee: '😀'.repeat(70) }))).toEqual(
        unavailable(/name is too long/),
      )
    })

    it('explains what’s missing', () => {
      expect(paymentQr(payment({ qr: 'sepa' }), invoice())).toEqual(unavailable(/Add your IBAN/))
      expect(paymentQr({ ...sepa, iban: 'DE89370400440532013001' }, invoice())).toEqual(
        unavailable(/Add your IBAN/),
      )
      expect(paymentQr({ ...sepa, bic: 'BANK' }, invoice())).toEqual(unavailable(/Check the BIC/))
      expect(paymentQr(sepa, invoice({ currency: 'GBP' }))).toEqual(unavailable(/euros/))
      expect(paymentQr(sepa, invoice({ payee: '' }))).toEqual(unavailable(/business name/))
      expect(paymentQr(sepa, invoice({ balanceDue: 0 }))).toEqual(unavailable(/Nothing is left/))
      expect(paymentQr(sepa, invoice({ balanceDue: 100_000_000_000 }))).toEqual(
        unavailable(/too large/),
      )
      expect(paymentQr(sepa, invoice({ balanceDue: 99_999_999_999 })).status).toBe('ready')
    })
  })
})

describe('invoicePaymentQr', () => {
  it('reads the amount, currency, payee and number off the invoice', () => {
    const sepa = payment({ qr: 'sepa', iban: 'DE89370400440532013000' })
    const result = invoicePaymentQr(sepa, createSampleInvoice({ currency: 'EUR' }))
    expect(result.status === 'ready' && result.qr.payload.split('\n')).toEqual([
      'BCD',
      '002',
      '1',
      'SCT',
      '',
      'Acme Studio',
      'DE89370400440532013000',
      'EUR3247.76',
      '',
      '',
      'Invoice INV-2026-0042',
    ])
  })
})

describe('IBANs', () => {
  it('accepts real IBANs however they are typed', () => {
    for (const iban of [
      'DE89370400440532013000',
      'gb82 west 1234 5698 7654 32',
      'NO93-8601-1117-947', // the shortest (15)
      'MT84MALT011000012345MTLCAST001S', // letters in the account part
    ]) {
      expect(isValidIban(iban), iban).toBe(true)
      expect(ibanIssue(iban)).toBeUndefined()
    }
  })

  it('rejects typos and wrong shapes', () => {
    for (const iban of [
      'DE89370400440532013001',
      'DE8937040044',
      '1234567890123456',
      'DE89 3704 ✓',
    ]) {
      expect(isValidIban(iban), iban).toBe(false)
    }
    expect(ibanIssue('DE89370400440532013001')).toMatch(/Check the IBAN/)
    expect(ibanIssue(' ')).toBeUndefined()
  })

  it('prints in groups of four', () => {
    expect(compactIban(' de89-3704 0044 ')).toBe('DE8937040044')
    expect(formatIban('DE89370400440532013000')).toBe('DE89 3704 0044 0532 0130 00')
    expect(formatIban('GB82WEST12345698765432')).toBe('GB82 WEST 1234 5698 7654 32')
  })
})

describe('BICs', () => {
  it('accepts 8 or 11 characters', () => {
    expect(bicIssue('')).toBeUndefined()
    expect(bicIssue('COBADEFF')).toBeUndefined()
    expect(bicIssue(' cobadeffxxx ')).toBeUndefined()
    expect(bicIssue('COBADEF')).toMatch(/8 or 11/)
    expect(bicIssue('COBADEFFXX')).toMatch(/8 or 11/)
  })
})
