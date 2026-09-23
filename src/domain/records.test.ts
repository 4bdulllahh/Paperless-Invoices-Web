import { describe, expect, it } from 'vitest'
import { emptyParty } from './draft'
import {
  businessIssues,
  emptyPaymentDetails,
  logoSchema,
  paymentDetailsSchema,
  paymentLinkIssue,
} from './records'

describe('businessIssues', () => {
  it('requires a name', () => {
    expect(businessIssues(emptyParty())).toEqual({ name: 'Enter your business or trading name.' })
    expect(businessIssues({ ...emptyParty(), name: '   ' }).name).toBeDefined()
  })

  it('accepts a missing email but not a malformed one', () => {
    const business = { ...emptyParty(), name: 'Acme Studio' }
    expect(businessIssues(business)).toEqual({})
    expect(businessIssues({ ...business, email: ' hello@acme.studio ' })).toEqual({})
    expect(businessIssues({ ...business, email: 'hello@' })).toEqual({
      email: 'Enter a valid email, e.g. hello@acme.studio.',
    })
  })
})

describe('paymentLinkIssue', () => {
  it.each(['', '  ', 'https://pay.example.com/acme', 'http://example.com'])('accepts %j', (link) =>
    expect(paymentLinkIssue(link)).toBeUndefined(),
  )

  it.each(['pay.example.com', 'javascript:alert(1)', 'ftp://example.com'])('rejects %j', (link) => {
    expect(paymentLinkIssue(link)).toBe('Enter a full link starting with https://')
  })
})

describe('logoSchema', () => {
  it('only accepts PNG or JPEG data URLs with a size', () => {
    const png = { dataUrl: 'data:image/png;base64,AAAA', width: 400, height: 200 }
    expect(logoSchema.safeParse(png).success).toBe(true)
    expect(logoSchema.safeParse({ ...png, dataUrl: 'data:image/jpeg;base64,AAAA' }).success).toBe(
      true,
    )
    expect(
      logoSchema.safeParse({ ...png, dataUrl: 'data:image/svg+xml;base64,AAAA' }).success,
    ).toBe(false)
    expect(logoSchema.safeParse({ ...png, width: 0 }).success).toBe(false)
  })
})

describe('paymentDetailsSchema', () => {
  it('gives profiles saved before 1.1 no payment methods, and checks the ones it gets', () => {
    const { methods: _, ...older } = emptyPaymentDetails()
    expect(paymentDetailsSchema.parse(older).methods).toEqual([])
    expect(
      paymentDetailsSchema.safeParse({ ...emptyPaymentDetails(), methods: ['cash', 'barter'] })
        .success,
    ).toBe(false)
  })
})
