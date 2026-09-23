import type { Logo } from '../domain/records'

/**
 * Turn an uploaded image into a logo, signature or stamp: validated, scaled down to print size,
 * and converted to a format the PDF renderer can embed. JPEG logos stay JPEG (small, and they
 * have no transparency); everything else becomes PNG to keep transparency. Signatures and stamps
 * also lose their white paper background, so they sit cleanly on the invoice. Runs entirely in
 * the browser.
 */

/** Offered in file pickers. Any image the browser can open is accepted, e.g. HEIC on Safari. */
export const ACCEPTED_LOGO_TYPES = ['image/*']
/** Phone photos are often 5–15 MB; they're scaled down anyway. */
export const MAX_LOGO_FILE_BYTES = 25 * 1024 * 1024
/** About 2.5 × the size a logo prints at, so it stays sharp. */
export const LOGO_MAX_WIDTH = 800
export const LOGO_MAX_HEIGHT = 400
/** Signatures and stamps print smaller. */
export const SIGNATURE_MAX_WIDTH = 600
export const SIGNATURE_MAX_HEIGHT = 300

export class LogoError extends Error {}

/** Scale down to fit inside the box, keeping proportions. Never scales up. */
export function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * Throws a LogoError with a message the user can act on. Some Android pickers hand over cloud
 * photos without a type, so those are tried too; opening the file is the real test.
 */
export function checkLogoFile(file: File) {
  const type = file.type
  if (type && !type.startsWith('image/') && type !== 'application/octet-stream') {
    throw new LogoError('Choose an image, e.g. a PNG or JPG.')
  }
  if (file.size > MAX_LOGO_FILE_BYTES) {
    throw new LogoError('That image is over 25 MB. Try a smaller file.')
  }
}

const UNREADABLE = 'That image couldn’t be opened. Try a PNG or JPG, or choose it from Files.'

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new LogoError(UNREADABLE))
    image.src = url
  })
}

type Drawable = { source: CanvasImageSource; width: number; height: number; close?: () => void }

/**
 * Decode the file. createImageBitmap handles large phone photos better and applies their EXIF
 * rotation; SVGs, and browsers without it, go through an <img>.
 */
async function decode(file: File, url: string): Promise<Drawable> {
  if (file.type !== 'image/svg+xml' && typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      }
    } catch {
      // Fall through to <img>, which some formats still open.
    }
  }
  const image = await loadImage(url)
  // SVGs without width/height report 0; give them a sensible drawing size.
  return {
    source: image,
    width: image.naturalWidth || LOGO_MAX_WIDTH,
    height: image.naturalHeight || LOGO_MAX_HEIGHT,
  }
}

/** JPEG in, JPEG out; anything else becomes PNG. */
export function outputTypeFor(fileType: string): 'image/jpeg' | 'image/png' {
  return fileType === 'image/jpeg' ? 'image/jpeg' : 'image/png'
}

/**
 * Make paper white see-through, in place (RGBA pixels). Near-white turns fully transparent and
 * light greys fade, so ink edges stay smooth rather than jagged.
 */
export function clearWhite(pixels: Uint8ClampedArray, solid = 200, clear = 238) {
  for (let i = 0; i < pixels.length; i += 4) {
    const lightest = Math.min(pixels[i], pixels[i + 1], pixels[i + 2])
    if (lightest >= clear) pixels[i + 3] = 0
    else if (lightest > solid) {
      pixels[i + 3] = Math.round((pixels[i + 3] * (clear - lightest)) / (clear - solid))
    }
  }
}

/** The smallest box holding every visible pixel, or null for an empty image. */
export function visibleBounds(pixels: Uint8ClampedArray, width: number, height: number) {
  let top = height
  let left = width
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue
      top = Math.min(top, y)
      bottom = Math.max(bottom, y)
      left = Math.min(left, x)
      right = Math.max(right, x)
    }
  }
  if (right < 0) return null
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
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

function context2d(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new LogoError('Your browser couldn’t process that image.')
  return context
}

/**
 * Crop a drawn or cleaned-up image to its ink and save it as PNG. Throws when there's nothing
 * left, e.g. a blank page.
 */
export async function trimmedPng(canvas: HTMLCanvasElement): Promise<Logo> {
  const context = context2d(canvas)
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
  const box = visibleBounds(data, canvas.width, canvas.height)
  if (!box) throw new LogoError('Nothing showed up. Try a darker image on white paper.')
  const cropped = document.createElement('canvas')
  cropped.width = box.width
  cropped.height = box.height
  context2d(cropped).drawImage(
    canvas,
    box.x,
    box.y,
    box.width,
    box.height,
    0,
    0,
    box.width,
    box.height,
  )
  return { dataUrl: await canvasToDataUrl(cropped, 'image/png'), ...box }
}

type PrepareOptions = {
  maxWidth: number
  maxHeight: number
  /** Signatures and stamps: remove the paper and crop to the ink. */
  clearBackground?: boolean
}

export async function prepareImage(
  file: File,
  { maxWidth, maxHeight, clearBackground = false }: PrepareOptions,
): Promise<Logo> {
  checkLogoFile(file)
  const url = URL.createObjectURL(file)
  try {
    const image = await decode(file, url)
    const size = fitWithin(image.width, image.height, maxWidth, maxHeight)
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = context2d(canvas)
    const type = clearBackground ? 'image/png' : outputTypeFor(file.type)
    if (type === 'image/jpeg') {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, size.width, size.height)
    }
    context.imageSmoothingQuality = 'high'
    context.drawImage(image.source, 0, 0, size.width, size.height)
    image.close?.()
    if (clearBackground) {
      const pixels = context.getImageData(0, 0, size.width, size.height)
      clearWhite(pixels.data)
      context.putImageData(pixels, 0, 0)
      return await trimmedPng(canvas)
    }
    return { dataUrl: await canvasToDataUrl(canvas, type), ...size }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export const prepareLogo = (file: File) =>
  prepareImage(file, { maxWidth: LOGO_MAX_WIDTH, maxHeight: LOGO_MAX_HEIGHT })

export const prepareSignature = (file: File) =>
  prepareImage(file, {
    maxWidth: SIGNATURE_MAX_WIDTH,
    maxHeight: SIGNATURE_MAX_HEIGHT,
    clearBackground: true,
  })
