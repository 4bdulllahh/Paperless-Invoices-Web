import type { ExportSection } from '../../domain/export'

/** Element id of each editor section, so problems found elsewhere can point to it. */
export const sectionElementId = (section: ExportSection) => `editor-section-${section}`

export const SECTION_LABELS: Record<ExportSection, string> = {
  billTo: 'Bill to',
  items: 'Items',
  invoice: 'Number & dates',
  from: 'From',
}

/**
 * Open an editor section, scroll it into view and put the cursor in its first field.
 * Returns false if the editor isn't on screen.
 */
export function revealSection(section: ExportSection): boolean {
  const details = document.getElementById(sectionElementId(section))
  if (!(details instanceof HTMLDetailsElement)) return false
  details.open = true
  details.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
  details.querySelector<HTMLElement>('input, textarea, select')?.focus({ preventScroll: true })
  return true
}
