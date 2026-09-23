import { currencyDigits } from './money'

/**
 * Amounts in words, as many invoices print them ("Three thousand two hundred forty-seven US
 * dollars and seventy-six cents"). South Asian currencies count in lakhs and crores; there,
 * and in the Gulf, amounts end with "only", as is customary.
 */

const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
]
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

/** 0–999 in words; empty for 0 (only whole numbers say "zero"). */
function belowThousand(n: number): string {
  const parts: string[] = []
  if (n >= 100) parts.push(`${ONES[Math.floor(n / 100)]} hundred`)
  const rest = n % 100
  if (rest >= 20) parts.push(TENS[Math.floor(rest / 10)] + (rest % 10 ? `-${ONES[rest % 10]}` : ''))
  else if (rest > 0) parts.push(ONES[rest])
  return parts.join(' ')
}

type Scale = [size: number, name: string]

const INTERNATIONAL: Scale[] = [
  [1e12, 'trillion'],
  [1e9, 'billion'],
  [1e6, 'million'],
  [1e3, 'thousand'],
]
const SOUTH_ASIAN: Scale[] = [
  [1e7, 'crore'],
  [1e5, 'lakh'],
  [1e3, 'thousand'],
]

/** A whole number (up to about a quadrillion) in words. */
export function numberToWords(n: number, southAsian = false): string {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(`Can’t write ${n} in words`)
  if (n === 0) return 'zero'
  const scales = southAsian ? SOUTH_ASIAN : INTERNATIONAL
  const parts: string[] = []
  let rest = n
  for (const [size, name] of scales) {
    const count = Math.floor(rest / size)
    if (count === 0) continue
    // Past the largest unit, the count itself can be large: "one hundred twenty crore".
    parts.push(`${numberToWords(count, southAsian)} ${name}`)
    rest %= size
  }
  if (rest > 0) parts.push(belowThousand(rest))
  return parts.join(' ')
}

/** [singular, plural] names for the main and minor units. */
type Units = { major: [string, string]; minor?: [string, string] }

const CURRENCY_UNITS: Record<string, Units> = {
  USD: { major: ['US dollar', 'US dollars'], minor: ['cent', 'cents'] },
  EUR: { major: ['euro', 'euros'], minor: ['cent', 'cents'] },
  GBP: { major: ['pound sterling', 'pounds sterling'], minor: ['penny', 'pence'] },
  CAD: { major: ['Canadian dollar', 'Canadian dollars'], minor: ['cent', 'cents'] },
  AUD: { major: ['Australian dollar', 'Australian dollars'], minor: ['cent', 'cents'] },
  NZD: { major: ['New Zealand dollar', 'New Zealand dollars'], minor: ['cent', 'cents'] },
  SGD: { major: ['Singapore dollar', 'Singapore dollars'], minor: ['cent', 'cents'] },
  HKD: { major: ['Hong Kong dollar', 'Hong Kong dollars'], minor: ['cent', 'cents'] },
  INR: { major: ['rupee', 'rupees'], minor: ['paisa', 'paise'] },
  PKR: { major: ['rupee', 'rupees'], minor: ['paisa', 'paisa'] },
  NPR: { major: ['rupee', 'rupees'], minor: ['paisa', 'paisa'] },
  LKR: { major: ['rupee', 'rupees'], minor: ['cent', 'cents'] },
  BDT: { major: ['taka', 'taka'], minor: ['poisha', 'poisha'] },
  AED: { major: ['dirham', 'dirhams'], minor: ['fils', 'fils'] },
  SAR: { major: ['riyal', 'riyals'], minor: ['halala', 'halalas'] },
  QAR: { major: ['riyal', 'riyals'], minor: ['dirham', 'dirhams'] },
  OMR: { major: ['rial', 'rials'], minor: ['baisa', 'baisa'] },
  KWD: { major: ['dinar', 'dinars'], minor: ['fils', 'fils'] },
  BHD: { major: ['dinar', 'dinars'], minor: ['fils', 'fils'] },
  JOD: { major: ['dinar', 'dinars'], minor: ['fils', 'fils'] },
  EGP: { major: ['Egyptian pound', 'Egyptian pounds'], minor: ['piastre', 'piastres'] },
  ZAR: { major: ['rand', 'rand'], minor: ['cent', 'cents'] },
  NGN: { major: ['naira', 'naira'], minor: ['kobo', 'kobo'] },
  KES: { major: ['Kenyan shilling', 'Kenyan shillings'], minor: ['cent', 'cents'] },
  JPY: { major: ['yen', 'yen'] },
  KRW: { major: ['won', 'won'] },
  CHF: { major: ['Swiss franc', 'Swiss francs'], minor: ['centime', 'centimes'] },
  SEK: { major: ['krona', 'kronor'], minor: ['öre', 'öre'] },
  NOK: { major: ['krone', 'kroner'], minor: ['øre', 'øre'] },
  DKK: { major: ['krone', 'kroner'], minor: ['øre', 'øre'] },
  PLN: { major: ['złoty', 'złoty'], minor: ['grosz', 'groszy'] },
  MYR: { major: ['ringgit', 'ringgit'], minor: ['sen', 'sen'] },
  PHP: { major: ['peso', 'pesos'], minor: ['centavo', 'centavos'] },
  THB: { major: ['baht', 'baht'], minor: ['satang', 'satang'] },
  MXN: { major: ['Mexican peso', 'Mexican pesos'], minor: ['centavo', 'centavos'] },
  BRL: { major: ['real', 'reais'], minor: ['centavo', 'centavos'] },
  TRY: { major: ['lira', 'lira'], minor: ['kuruş', 'kuruş'] },
}

const SOUTH_ASIAN_CURRENCIES = new Set(['INR', 'PKR', 'NPR', 'BDT'])
/** Where "only" customarily ends the amount. */
const ONLY_CURRENCIES = new Set([
  ...SOUTH_ASIAN_CURRENCIES,
  'LKR',
  'AED',
  'SAR',
  'QAR',
  'OMR',
  'KWD',
  'BHD',
  'JOD',
  'EGP',
])

const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1)

/**
 * An amount in minor units (cents, fils…) in words. Currencies without their own unit names use
 * the English currency name, with the minor part as a fraction: "… Czech korunas and 45/100".
 */
export function amountInWords(minor: number, currency: string): string {
  const digits = currencyDigits(currency)
  const factor = 10 ** digits
  const major = Math.floor(minor / factor)
  const cents = minor % factor
  const southAsian = SOUTH_ASIAN_CURRENCIES.has(currency)
  const units = CURRENCY_UNITS[currency]
  const pick = ([one, many]: [string, string], n: number) => (n === 1 ? one : many)

  let text: string
  if (units) {
    text = `${numberToWords(major, southAsian)} ${pick(units.major, major)}`
    if (cents > 0 && units.minor) {
      text += ` and ${numberToWords(cents, southAsian)} ${pick(units.minor, cents)}`
    }
  } else {
    // Falls back to the code itself for currencies it can't name.
    const name = new Intl.DisplayNames(['en'], { type: 'currency' }).of(currency) as string
    text = `${numberToWords(major)} ${name}`
    if (cents > 0) text += ` and ${String(cents).padStart(digits, '0')}/${factor}`
  }
  if (ONLY_CURRENCIES.has(currency)) text += ' only'
  return capitalize(text)
}
