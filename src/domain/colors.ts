/**
 * The PDF's theme colour. The user picks one accent; everything printed on or in it is worked
 * out here so it stays readable: text on an accent fill turns dark or white, whichever stands
 * out more, and accent-coloured text is darkened on paper (or lightened on ink) until it has
 * enough contrast: WCAG's 3:1 for large text on paper, where it's only used for big headings,
 * totals and rules, and 4.5:1 on ink, where it's smaller and dark colours fade into the black.
 */

export const DEFAULT_ACCENT = '#eb5e28'

/** Six-digit lowercase hex, the only form that's saved. */
export const HEX_COLOR = /^#[0-9a-f]{6}$/

/** Ready-made accents, shown as swatches. The first is Paperless's own flame. */
export const ACCENT_PRESETS = [
  { name: 'Flame', value: DEFAULT_ACCENT },
  { name: 'Crimson', value: '#c8102e' },
  { name: 'Rose', value: '#d6457a' },
  { name: 'Plum', value: '#7b3f8c' },
  { name: 'Indigo', value: '#4b4fc4' },
  { name: 'Navy', value: '#1f3a68' },
  { name: 'Ocean', value: '#1d74b8' },
  { name: 'Teal', value: '#11867f' },
  { name: 'Emerald', value: '#1f8a4c' },
  { name: 'Olive', value: '#6b7b2c' },
  { name: 'Gold', value: '#e0a526' },
  { name: 'Charcoal', value: '#403d39' },
] as const

/** Print colours the theme is measured against. */
const PAPER = '#ffffff'
const INK = '#252422'
const BLACK = '#000000'
const MIN_ON_PAPER = 3
const MIN_ON_INK = 4.5

type Rgb = [number, number, number]

function toRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

/** "#ABC", "abc", " #AABBCC " → "#aabbcc"; null when it isn't a hex colour. */
export function normaliseHex(input: string): string | null {
  const text = input.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{3}$/.test(text)) return `#${[...text].map((c) => c + c).join('')}`
  return /^[0-9a-f]{6}$/.test(text) ? `#${text}` : null
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

/** `amount` of the way from `from` to `to`. */
export function mix(from: string, to: string, amount: number): string {
  const a = toRgb(from)
  const b = toRgb(to)
  return toHex([0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * amount) as Rgb)
}

/** `color`, moved towards `towards` in small steps until it stands out enough on `background`. */
function readableOn(color: string, background: string, towards: string, min: number): string {
  const steps = Array.from({ length: 21 }, (_, step) => mix(color, towards, step / 20))
  // Black on paper and white on ink always stand out, so one is always found.
  return steps.find((candidate) => contrast(candidate, background) >= min)!
}

export type PdfTheme = {
  /** Fills: bands, badges, the balance box, rules. */
  accent: string
  /** Text printed on an accent fill: ink or white, whichever reads better. */
  onAccent: string
  /** Accent-coloured text and rules on white paper, darkened if too light. */
  accentOnPaper: string
  /** Accent-coloured text on an ink block, lightened if too dark. */
  accentOnInk: string
  /** A pale wash of the accent, for table headings. */
  accentTint: string
}

export function pdfTheme(accent: string): PdfTheme {
  const color = HEX_COLOR.test(accent) ? accent : DEFAULT_ACCENT
  return {
    accent: color,
    onAccent: contrast(color, INK) >= contrast(color, PAPER) ? INK : PAPER,
    accentOnPaper: readableOn(color, PAPER, BLACK, MIN_ON_PAPER),
    accentOnInk: readableOn(color, INK, PAPER, MIN_ON_INK),
    accentTint: mix(color, PAPER, 0.88),
  }
}

/** Hue (0–360), saturation and value (0–1): the picker's square and hue slider. */
export type Hsv = { h: number; s: number; v: number }

export function hexToHsv(hex: string): Hsv {
  const [r, g, b] = toRgb(hex).map((c) => c / 255)
  const max = Math.max(r, g, b)
  const delta = max - Math.min(r, g, b)
  let h = 0
  if (delta > 0) {
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
  }
  return { h: (h * 60 + 360) % 360, s: max === 0 ? 0 : delta / max, v: max }
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6
    return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255
  }
  return toHex([channel(5), channel(3), channel(1)])
}
