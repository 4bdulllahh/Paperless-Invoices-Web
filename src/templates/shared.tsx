import { Image, Link, Path, Rect, Svg, Text, View } from '@react-pdf/renderer'
import type { PaymentQr } from '../domain/paymentQr'
import { PAYMENT_METHOD_LABELS, type Logo, type PaymentDetails } from '../domain/records'
import type { PartyView } from '../domain/viewModel'
import { INK, partyLines, type Style } from './layout'
import { QR_QUIET_ZONE, qrMatrix, qrPath } from './qr'

/** About 26 mm: easy for a phone camera to read from a printed page. */
const QR_SIZE = 74

export function PartyBlock({
  party,
  nameStyle,
  lineStyle,
}: {
  party: PartyView
  nameStyle: Style
  lineStyle: Style
}) {
  return (
    <View>
      {party.name ? <Text style={nameStyle}>{party.name}</Text> : null}
      {partyLines(party).map((line, i) => (
        <Text key={i} style={lineStyle}>
          {line}
        </Text>
      ))}
    </View>
  )
}

/** Logo scaled to fit a box, keeping its proportions. */
export function LogoImage({
  logo,
  maxWidth,
  maxHeight,
}: {
  logo: Logo
  maxWidth: number
  maxHeight: number
}) {
  const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height)
  return (
    <Image src={logo.dataUrl} style={{ width: logo.width * scale, height: logo.height * scale }} />
  )
}

/**
 * A QR code as vector shapes, so it prints sharp at any size. `size` is the code itself; the
 * blank margin scanners need is drawn in white around it, outside the layout box.
 */
export function QrCode({ value, size }: { value: string; size: number }) {
  const matrix = qrMatrix(value)
  const units = matrix.length + QR_QUIET_ZONE * 2
  const margin = (size / matrix.length) * QR_QUIET_ZONE
  return (
    <Svg
      width={size + margin * 2}
      height={size + margin * 2}
      viewBox={`0 0 ${units} ${units}`}
      style={{ margin: -margin }}
    >
      <Rect x={0} y={0} width={units} height={units} fill="#ffffff" />
      <Path d={qrPath(matrix, QR_QUIET_ZONE)} fill={INK} />
    </Svg>
  )
}

/**
 * Accepted payment methods, instructions, a clickable link and a QR code, plus notes; each only
 * if there is one.
 */
export function PaymentAndNotes({
  payment,
  qr,
  notes,
  payableTo,
  headingStyle,
  textStyle,
  linkStyle,
}: {
  payment: PaymentDetails
  qr: PaymentQr | null
  notes: string
  /** Who cheques are made out to: the sender's name. */
  payableTo: string
  headingStyle: Style
  textStyle: Style
  linkStyle: Style
}) {
  const instructions = payment.instructions.trim()
  const methods = payment.methods.map((method) => PAYMENT_METHOD_LABELS[method])
  const cheques = payment.methods.includes('cheque') && payableTo
  return (
    <View style={{ gap: 14 }}>
      {(instructions || payment.link || qr || methods.length > 0) && (
        <View>
          <Text style={headingStyle}>Payment</Text>
          {methods.length > 0 ? (
            <Text style={textStyle}>Accepted: {methods.join(' · ')}</Text>
          ) : null}
          {cheques ? <Text style={textStyle}>Cheques payable to {payableTo}</Text> : null}
          {instructions ? <Text style={textStyle}>{instructions}</Text> : null}
          {payment.link ? (
            <Link src={payment.link} style={linkStyle}>
              {payment.link}
            </Link>
          ) : null}
          {qr && (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 }}
              wrap={false}
            >
              <QrCode value={qr.payload} size={QR_SIZE} />
              <View style={{ flex: 1 }}>
                <Text style={headingStyle}>{qr.title}</Text>
                <Text style={textStyle}>{qr.detail}</Text>
              </View>
            </View>
          )}
        </View>
      )}
      {notes ? (
        <View>
          <Text style={headingStyle}>Notes</Text>
          <Text style={textStyle}>{notes}</Text>
        </View>
      ) : null}
    </View>
  )
}

/** "Amount in words: Three thousand … only", under the totals, when the invoice asks for it. */
export function TotalInWords({
  text,
  style,
  labelStyle,
}: {
  text: string | null
  style: Style
  labelStyle: Style
}) {
  if (!text) return null
  return (
    <Text style={style} wrap={false}>
      <Text style={labelStyle}>Amount in words: </Text>
      {text}
    </Text>
  )
}

/** "INV-2026-0042 · Page 1 of 2", repeated at the bottom of every page. */
export function PageFooter({ number, style }: { number: string; style: Style }) {
  return (
    <Text
      fixed
      style={style}
      render={({ pageNumber, totalPages }) =>
        `${number ? `${number} · ` : ''}Page ${pageNumber} of ${totalPages}`
      }
    />
  )
}
