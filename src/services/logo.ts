import type { Logo } from '../domain/records'

/**
 * Turn an uploaded image into a logo: validated, scaled down to print size, and converted to a
 * format the PDF renderer can embed. JPEGs stay JPEG (small, and they have no transparency);
 * everything else becomes PNG to keep transparency. Runs entirely in the browser.
 */

export const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
export const MAX_LOGO_FILE_BYTES = 10 * 1024 * 1024
/** About 2.5 × the size a logo prints at, so it stays sharp. */
export const LOGO_MAX_WIDTH = 800
export const LOGO_MAX_HEIGHT = 400

export class LogoError extends Error {}

/** Scale down to fit inside the box, keeping proportions. Never scales up. */
export function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Throws a LogoError with a message the user can act on. */
export function checkLogoFile(file: File) {
  if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
    throw new LogoError('Use a PNG, JPG, WebP or SVG image.')
  }
  if (file.size > MAX_LOGO_FILE_BYTES) {
    throw new LogoError('That image is over 10 MB. Try a smaller file.')
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new LogoError('That image couldn’t be opened. Try another file.'))
    image.src = url
  })
}

/** JPEG in, JPEG out; anything else becomes PNG. */
export function outputTypeFor(fileType: string): 'image/jpeg' | 'image/png' {
  return fileType === 'image/jpeg' ? 'image/jpeg' : 'image/png'
}

function canvasToDataUrl(canvas: HTMLCanvasElement, type: string): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new LogoError('That image couldn’t be processed.'))
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new LogoError('That image couldn’t be processed.'))
        reader.readAsDataURL(blob)
      },
      type,
      0.92,
    )
  })
}

export async function prepareLogo(file: File): Promise<Logo> {
  checkLogoFile(file)
  const url = URL.createObjectURL(file)
  try {
    const image = await loadImage(url)
    // SVGs without width/height report 0; give them a sensible drawing size.
    const size = fitWithin(
      image.naturalWidth || LOGO_MAX_WIDTH,
      image.naturalHeight || LOGO_MAX_HEIGHT,
      LOGO_MAX_WIDTH,
      LOGO_MAX_HEIGHT,
    )
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) throw new LogoError('Your browser couldn’t process that image.')
    const type = outputTypeFor(file.type)
    if (type === 'image/jpeg') {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, size.width, size.height)
    }
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, size.width, size.height)
    return { dataUrl: await canvasToDataUrl(canvas, type), ...size }
  } finally {
    URL.revokeObjectURL(url)
  }
}
