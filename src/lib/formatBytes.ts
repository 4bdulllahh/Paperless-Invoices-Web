const UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const

/** 1536 → "1.5 kB" */
export function formatBytes(bytes: number, locale?: string): string {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit++
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: UNITS[unit],
    unitDisplay: 'short',
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value)
}
