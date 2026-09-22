/**
 * Calendar dates as ISO strings ("2026-09-23"). Invoices deal in whole days, so there are no
 * times or time zones here: arithmetic runs in UTC to avoid daylight-saving shifts.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** Today's date on the user's own calendar. */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Due before today. ISO dates compare correctly as strings. */
export function isOverdue(dueDate: string, today: string): boolean {
  return dueDate < today
}
