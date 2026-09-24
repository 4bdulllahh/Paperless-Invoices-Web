import { describe, expect, it } from 'vitest'
import {
  ACCENT_PRESETS,
  contrast,
  DEFAULT_ACCENT,
  hexToHsv,
  HEX_COLOR,
  hsvToHex,
  luminance,
  mix,
  normaliseHex,
  pdfTheme,
} from './colors'

const INK = '#252422'
const WHITE = '#ffffff'

describe('normaliseHex', () => {
  it.each([
    ['#EB5E28', '#eb5e28'],
    ['eb5e28', '#eb5e28'],
    [' #abc ', '#aabbcc'],
    ['F0A', '#ff00aa'],
  ])('%s → %s', (input, hex) => {
    expect(normaliseHex(input)).toBe(hex)
  })

  it.each(['', '#12', '#12345', 'red', '#ggg000'])('rejects %j', (input) => {
    expect(normaliseHex(input)).toBeNull()
  })
})

describe('contrast', () => {
  it('follows WCAG', () => {
    expect(luminance(WHITE)).toBe(1)
    expect(luminance('#000000')).toBe(0)
    expect(contrast('#000000', WHITE)).toBe(21)
    expect(contrast(WHITE, '#000000')).toBe(21)
    expect(contrast(DEFAULT_ACCENT, DEFAULT_ACCENT)).toBe(1)
  })

  it('mixes colours in a straight line', () => {
    expect(mix('#000000', WHITE, 0.5)).toBe('#808080')
    expect(mix(DEFAULT_ACCENT, WHITE, 0)).toBe(DEFAULT_ACCENT)
    expect(mix(DEFAULT_ACCENT, WHITE, 1)).toBe(WHITE)
  })
})

describe('pdfTheme', () => {
  it('leaves Paperless’s flame exactly as it always printed', () => {
    expect(pdfTheme(DEFAULT_ACCENT)).toEqual({
      accent: DEFAULT_ACCENT,
      onAccent: INK,
      accentOnPaper: DEFAULT_ACCENT,
      accentOnInk: DEFAULT_ACCENT,
      accentTint: '#fdece5',
    })
  })

  it('prints white on dark colours and ink on light ones', () => {
    expect(pdfTheme('#1f3a68').onAccent).toBe(WHITE)
    expect(pdfTheme('#c8102e').onAccent).toBe(WHITE)
    expect(pdfTheme('#e0a526').onAccent).toBe(INK)
    expect(pdfTheme('#fff3a0').onAccent).toBe(INK)
  })

  it('darkens pale accents on paper and lightens dark ones on ink', () => {
    const pale = pdfTheme('#fff3a0')
    expect(pale.accentOnPaper).not.toBe('#fff3a0')
    expect(contrast(pale.accentOnPaper, WHITE)).toBeGreaterThanOrEqual(3)
    expect(pale.accentOnInk).toBe('#fff3a0')

    const navy = pdfTheme('#0a0a40')
    expect(navy.accentOnPaper).toBe('#0a0a40')
    expect(navy.accentOnInk).not.toBe('#0a0a40')
    expect(contrast(navy.accentOnInk, INK)).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps every ready-made colour readable', () => {
    for (const { value } of ACCENT_PRESETS) {
      const theme = pdfTheme(value)
      expect(value).toMatch(HEX_COLOR)
      expect(contrast(theme.onAccent, value)).toBeGreaterThanOrEqual(3.4)
      expect(contrast(theme.accentOnPaper, WHITE)).toBeGreaterThanOrEqual(3)
      expect(contrast(theme.accentOnInk, INK)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(INK, theme.accentTint)).toBeGreaterThanOrEqual(12)
    }
  })

  it('falls back to flame for anything that isn’t a saved hex colour', () => {
    expect(pdfTheme('red').accent).toBe(DEFAULT_ACCENT)
  })
})

describe('hexToHsv and hsvToHex', () => {
  it.each([
    ['#ff0000', { h: 0, s: 1, v: 1 }],
    ['#00ff00', { h: 120, s: 1, v: 1 }],
    ['#0000ff', { h: 240, s: 1, v: 1 }],
    ['#ff00ff', { h: 300, s: 1, v: 1 }],
    ['#000000', { h: 0, s: 0, v: 0 }],
    ['#808080', { h: 0, s: 0, v: 128 / 255 }],
  ])('%s', (hex, hsv) => {
    expect(hexToHsv(hex)).toEqual(hsv)
    expect(hsvToHex(hsv)).toBe(hex)
  })

  it('round-trips every ready-made colour', () => {
    for (const { value } of ACCENT_PRESETS) expect(hsvToHex(hexToHsv(value))).toBe(value)
  })
})
