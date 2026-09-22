import { Image, Link, Path, Rect, Svg, Text, View } from '@react-pdf/renderer'
import type { PaymentQr } from '../domain/paymentQr'
import type { Logo, PaymentDetails } from '../domain/records'
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

/** Payment instructions, a clickable link and a QR code, plus notes; each only if there is one. */
export function PaymentAndNotes({
  payment,
  qr,
  notes,
  headingStyle,
  textStyle,
  linkStyle,
}: {
  payment: PaymentDetails
  qr: PaymentQr | null
  notes: string
  headingStyle: Style
  textStyle: Style
  linkStyle: Style
}) {
  const instructions = payment.instructions.trim()
  return (
    <View style={{ gap: 14 }}>
      {(instructions || payment.link || qr) && (
        <View>
          <Text style={headingStyle}>Payment</Text>
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
