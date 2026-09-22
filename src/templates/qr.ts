import { create } from 'qrcode'

/** Blank modules a scanner needs around the code to find it. */
export const QR_QUIET_ZONE = 4

/**
 * The QR code for some text, as rows of dark (true) and light modules. Error correction level M,
 * which the EPC standard requires and which survives a crease or smudge on printed paper.
 */
export function qrMatrix(text: string): boolean[][] {
  const { modules } = create(text, { errorCorrectionLevel: 'M' })
  return Array.from({ length: modules.size }, (_, row) =>
    Array.from({ length: modules.size }, (_, col) => Boolean(modules.get(row, col))),
  )
}

/**
 * Every dark module as one SVG path, one unit per module, shifted by `offset` units. Runs along a
 * row become a single rectangle, which keeps the PDF small, and a single path fills without the
 * hairline seams separate squares can show.
 */
export function qrPath(matrix: boolean[][], offset = 0): string {
  let path = ''
  matrix.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue
      const start = x
      while (row[x + 1]) x++
      const length = x - start + 1
      path += `M${start + offset} ${y + offset}h${length}v1h-${length}z`
    }
  })
  return path
}
