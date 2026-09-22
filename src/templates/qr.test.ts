import jsQR from 'jsqr'
import { describe, expect, it } from 'vitest'
import { QR_QUIET_ZONE, qrMatrix, qrPath } from './qr'

/** Draw a matrix the way a camera would see it: 4px modules, black on white, with a margin. */
function scan(matrix: boolean[][]): string | undefined {
  const scale = 4
  const size = (matrix.length + QR_QUIET_ZONE * 2) * scale
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255)
  matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (!dark) return
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = (x + QR_QUIET_ZONE) * scale + dx
          const py = (y + QR_QUIET_ZONE) * scale + dy
          pixels.fill(0, (py * size + px) * 4, (py * size + px) * 4 + 3)
        }
      }
    }),
  )
  return jsQR(pixels, size, size)?.data
}

/** Turn a path from qrPath back into the modules it covers. */
function unpath(path: string, size: number, offset: number): boolean[][] {
  const matrix = Array.from({ length: size }, () => Array<boolean>(size).fill(false))
  for (const [, x, y, length] of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\3z/g)) {
    for (let i = 0; i < Number(length); i++) {
      matrix[Number(y) - offset][Number(x) - offset + i] = true
    }
  }
  return matrix
}

const payloads = {
  link: 'https://pay.example.com/acme-studio',
  upi: 'upi://pay?pa=acmestudio@okhdfcbank&pn=Acme%20Studio&am=12500.00&cu=INR&tn=Invoice%20INV-2026-0042',
  sepa: 'BCD\n002\n1\nSCT\nCOBADEFFXXX\nMüller & Söhne GmbH\nDE89370400440532013000\nEUR3247.76\n\n\nInvoice INV-2026-0042',
}

describe('QR codes', () => {
  it.each(Object.entries(payloads))('scan back to exactly what was encoded (%s)', (_, text) => {
    expect(scan(qrMatrix(text))).toBe(text)
  })

  it('are square, and larger for longer text', () => {
    const short = qrMatrix(payloads.link)
    const long = qrMatrix(payloads.sepa)
    expect(short.every((row) => row.length === short.length)).toBe(true)
    expect(long.length).toBeGreaterThan(short.length)
  })

  it('draw every dark module and nothing else', () => {
    const matrix = qrMatrix(payloads.sepa)
    const path = qrPath(matrix, QR_QUIET_ZONE)
    expect(unpath(path, matrix.length, QR_QUIET_ZONE)).toEqual(matrix)
    // Runs along a row are merged into one shape.
    const shapes = path.split('M').length - 1
    expect(shapes).toBeLessThan(matrix.flat().filter(Boolean).length * 0.6)
    expect(qrPath([[true, true, false, true]])).toBe('M0 0h2v1h-2zM3 0h1v1h-1z')
  })
})
