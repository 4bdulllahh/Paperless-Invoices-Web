/**
 * Invoice number patterns, e.g. "INV-{YYYY}-{####}" → "INV-2026-0042".
 *
 * Tokens: {YYYY} year, {YY} two-digit year, {MM} month, {DD} day (all from the issue date),
 * and {#...} the sequence number zero-padded to the number of #s. Longer sequences are never cut.
 */

export const DEFAULT_NUMBER_PATTERN = 'INV-{YYYY}-{####}'

const TOKEN = /\{(YYYY|YY|MM|DD|#+)\}/g
const SEQUENCE_TOKEN = /\{#+\}/

export function formatInvoiceNumber(pattern: string, sequence: number, issueDate: string): string {
  const [year, month, day] = issueDate.split('-')
  return pattern.replace(TOKEN, (_, token: string) => {
    switch (token) {
      case 'YYYY':
        return year
      case 'YY':
        return year.slice(-2)
      case 'MM':
        return month
      case 'DD':
        return day
      default:
        return String(sequence).padStart(token.length, '0')
    }
  })
}

/** Without a sequence token every invoice would get the same number. */
export function hasSequenceToken(pattern: string): boolean {
  return SEQUENCE_TOKEN.test(pattern)
}
