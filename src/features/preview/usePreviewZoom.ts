import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

/** Zoom is relative to "fit width": 1 means the page is exactly as wide as the pane. */
export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 3
const STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3]
/** A4 is 210 × 297 mm. */
const PAGE_RATIO = 210 / 297
const STORAGE_KEY = 'paperless:preview-zoom'

type Saved = { fitPage: boolean; zoom: number }

const clamp = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

function readSaved(): Saved {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as Partial<Saved>
    if (typeof saved.zoom === 'number') {
      return { fitPage: saved.fitPage === true, zoom: clamp(saved.zoom) }
    }
  } catch {
    // Nothing saved, or storage is unavailable: start at fit width.
  }
  return { fitPage: false, zoom: 1 }
}

/**
 * Zooming the preview: buttons, Ctrl/⌘ + scroll, and pinch (trackpad or touch). The point being
 * looked at stays in place while zooming. Also works out how many pixels the pages need to be
 * drawn with to stay sharp at the current size.
 */
export function usePreviewZoom(pane: RefObject<HTMLElement | null>) {
  const [saved, setSaved] = useState(readSaved)
  const [size, setSize] = useState({ width: 0, height: 0 })
  // Where the view was centred (0–1 of the content) before the last zoom, to restore it.
  const anchor = useRef<{ x: number; y: number } | null>(null)

  // The zoom at which a whole page fits the pane.
  const fitPageZoom = size.width > 0 ? Math.min(1, (size.height * PAGE_RATIO) / size.width) : 1
  const zoom = saved.fitPage ? fitPageZoom : saved.zoom

  useEffect(() => {
    const el = pane.current
    // jsdom (tests) has no ResizeObserver; the pane then keeps its default size.
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [pane])

  function apply(next: Saved) {
    const el = pane.current
    if (el) {
      anchor.current = {
        x: (el.scrollLeft + el.clientWidth / 2) / Math.max(el.scrollWidth, 1),
        y: (el.scrollTop + el.clientHeight / 2) / Math.max(el.scrollHeight, 1),
      }
    }
    setSaved(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Only a convenience: the zoom still applies for this visit.
    }
  }

  const setZoom = (next: number) => apply({ fitPage: false, zoom: clamp(next) })

  // Keep the same spot centred after the pages change size.
  useLayoutEffect(() => {
    const point = anchor.current
    if (!point) return
    anchor.current = null
    pane.current?.scrollTo?.({
      left: point.x * pane.current.scrollWidth - pane.current.clientWidth / 2,
      top: point.y * pane.current.scrollHeight - pane.current.clientHeight / 2,
    })
  }, [pane, zoom])

  // The gesture listeners below are added once; they read the latest zoom and setter here.
  const latest = useRef({ zoom, setZoom })
  useLayoutEffect(() => {
    latest.current = { zoom, setZoom }
  })

  // Ctrl/⌘ + wheel, which is also what trackpad pinches send. Needs a non-passive listener
  // to stop the browser zooming the whole page instead.
  useEffect(() => {
    const el = pane.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const { zoom: current, setZoom: set } = latest.current
      // A mouse-wheel notch reports ~100; trackpad pinches send many small deltas. Capping each
      // event makes a notch about 1.2× while pinching stays smooth.
      const delta = Math.max(-50, Math.min(50, e.deltaY))
      set(current * Math.exp(-delta * 0.004))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [pane])

  // Two-finger pinch on touch screens. The pane's touch-action leaves pinching to us.
  useEffect(() => {
    const el = pane.current
    if (!el) return
    let start: { distance: number; zoom: number } | null = null
    const distance = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        start = { distance: distance(e.touches), zoom: latest.current.zoom }
      }
    }
    const onMove = (e: TouchEvent) => {
      if (!start || e.touches.length !== 2) return
      e.preventDefault()
      latest.current.setZoom((start.zoom * distance(e.touches)) / start.distance)
    }
    const onEnd = () => {
      start = null
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [pane])

  // Draw pages with enough pixels for their size on screen, in steps so small changes don't
  // cause a redraw: 1240 px (about 150 dpi) up to 3720 px.
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  const needed = size.width * zoom * dpr
  const resolution = Math.min(3720, Math.max(1240, Math.ceil(needed / 620) * 620))

  return {
    zoom,
    fitPage: saved.fitPage,
    resolution,
    /** CSS width for each page. */
    pageWidth: `calc(100cqw * ${zoom})`,
    zoomIn: () => setZoom(STEPS.find((step) => step > zoom + 0.01) ?? MAX_ZOOM),
    zoomOut: () => setZoom([...STEPS].reverse().find((step) => step < zoom - 0.01) ?? MIN_ZOOM),
    fitWidth: () => setZoom(1),
    toggleFitPage: () => apply({ fitPage: !saved.fitPage, zoom: saved.fitPage ? 1 : saved.zoom }),
  }
}
