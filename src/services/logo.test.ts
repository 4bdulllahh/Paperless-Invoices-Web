import { describe, expect, it } from 'vitest'
import { checkLogoFile, fitWithin, LogoError, MAX_LOGO_FILE_BYTES, outputTypeFor } from './logo'

describe('fitWithin', () => {
  it.each`
    width    | height  | fitsAs                         | case
    ${1600}  | ${400}  | ${{ width: 800, height: 200 }} | ${'too wide'}
    ${400}   | ${800}  | ${{ width: 200, height: 400 }} | ${'too tall'}
    ${300}   | ${100}  | ${{ width: 300, height: 100 }} | ${'already fits (never scaled up)'}
    ${4000}  | ${3000} | ${{ width: 533, height: 400 }} | ${'a large photo'}
    ${10000} | ${1}    | ${{ width: 800, height: 1 }}   | ${'a hairline (never collapses to 0)'}
  `('scales $case', ({ width, height, fitsAs }) => {
    expect(fitWithin(width, height, 800, 400)).toEqual(fitsAs)
  })
})

describe('checkLogoFile', () => {
  const file = (type: string, size = 1000) => new File([new Uint8Array(size)], 'logo', { type })

  it.each(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])('accepts %s', (type) => {
    expect(() => checkLogoFile(file(type))).not.toThrow()
  })

  it('rejects other file types with a helpful message', () => {
    expect(() => checkLogoFile(file('application/pdf'))).toThrow(
      new LogoError('Use a PNG, JPG, WebP or SVG image.'),
    )
  })

  it('rejects very large files', () => {
    expect(() => checkLogoFile(file('image/png', MAX_LOGO_FILE_BYTES + 1))).toThrow(/over 10 MB/)
  })
})

describe('outputTypeFor', () => {
  it('keeps JPEGs as JPEG and turns everything else into PNG', () => {
    expect(outputTypeFor('image/jpeg')).toBe('image/jpeg')
    expect(outputTypeFor('image/png')).toBe('image/png')
    expect(outputTypeFor('image/webp')).toBe('image/png')
    expect(outputTypeFor('image/svg+xml')).toBe('image/png')
  })
})
