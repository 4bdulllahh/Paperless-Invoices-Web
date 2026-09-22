import { Font } from '@react-pdf/renderer'

/**
 * Fonts embedded in PDFs (public/fonts, unmodified OFL files). Families are listed with Inter
 * as a per-character fallback: Libre Baskerville and Space Grotesk lack some currency symbols
 * (₹, ₦, ₨…), and those glyphs are taken from Inter instead of printing as empty boxes.
 */
export const FONTS = {
  sans: ['Inter'],
  display: ['Space Grotesk', 'Inter'],
  serif: ['Libre Baskerville', 'Inter'],
}

let registeredFrom: string | null = null

/** Register once per base location: "/fonts" in the browser, a folder path in tests. */
export function registerPdfFonts(base: string) {
  if (registeredFrom === base) return
  registeredFrom = base
  Font.register({
    family: 'Inter',
    fonts: [
      { src: `${base}/inter-400.woff`, fontWeight: 400 },
      { src: `${base}/inter-600.woff`, fontWeight: 600 },
      // Inter is only the fallback in italic text (e.g. a ₹ in Classic's italic notes), so the
      // upright file stands in rather than shipping an italic font for a few symbols.
      { src: `${base}/inter-400.woff`, fontWeight: 400, fontStyle: 'italic' },
    ],
  })
  Font.register({
    family: 'Space Grotesk',
    fonts: [
      { src: `${base}/space-grotesk-500.woff`, fontWeight: 500 },
      { src: `${base}/space-grotesk-700.woff`, fontWeight: 700 },
    ],
  })
  Font.register({
    family: 'Libre Baskerville',
    fonts: [
      { src: `${base}/libre-baskerville-400.woff`, fontWeight: 400 },
      { src: `${base}/libre-baskerville-400-italic.woff`, fontWeight: 400, fontStyle: 'italic' },
      { src: `${base}/libre-baskerville-700.woff`, fontWeight: 700 },
    ],
  })
  // Names, emails and references must never be split with hyphens.
  Font.registerHyphenationCallback((word) => [word])
}
