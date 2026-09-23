import { describe, expect, it } from 'vitest'
import {
  checkLogoFile,
  clearWhite,
  fitWithin,
  LogoError,
  MAX_LOGO_FILE_BYTES,
  outputTypeFor,
  visibleBounds,
} from './logo'

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

  // Android pickers can hand over cloud photos with no type, or a generic one: those are tried.
  it.each([
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'image/heic',
    '',
    'application/octet-stream',
  ])('accepts "%s"', (type) => {
    expect(() => checkLogoFile(file(type))).not.toThrow()
  })

  it('rejects files that aren’t images with a helpful message', () => {
    expect(() => checkLogoFile(file('application/pdf'))).toThrow(
      new LogoError('Choose an image, e.g. a PNG or JPG.'),
    )
  })

  it('rejects very large files', () => {
    expect(() => checkLogoFile(file('image/png', MAX_LOGO_FILE_BYTES + 1))).toThrow(/over 25 MB/)
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

describe('clearWhite', () => {
  it('makes paper see-through and fades light greys, leaving ink alone', () => {
    const pixels = new Uint8ClampedArray([
      255,
      255,
      255,
      255, // paper
      219,
      230,
      240,
      255, // light grey: half faded
      20,
      30,
      90,
      255, // blue ink
    ])
    clearWhite(pixels)
    expect([pixels[3], pixels[7], pixels[11]]).toEqual([0, 128, 255])
  })
})

describe('visibleBounds', () => {
  it('finds the box around visible pixels', () => {
    // 3 × 2 image with one visible pixel at (2, 1).
    const pixels = new Uint8ClampedArray(3 * 2 * 4)
    expect(visibleBounds(pixels, 3, 2)).toBeNull()
    pixels[(1 * 3 + 2) * 4 + 3] = 255
    pixels[1 * 4 + 3] = 10
    expect(visibleBounds(pixels, 3, 2)).toEqual({ x: 1, y: 0, width: 2, height: 2 })
  })
})
