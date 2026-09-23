import { Image, Link, Path, Rect, Svg, Text, View } from '@react-pdf/renderer'
import type { PaymentQr } from '../domain/paymentQr'
import { PAYMENT_METHOD_LABELS, type Logo, type PaymentDetails } from '../domain/records'
import type { PartyView } from '../domain/viewModel'
import { FONTS } from './fonts'
import { bankLines, INK, MUTED, partyLines, type Style } from './layout'
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
 * Accepted payment methods, bank details, instructions, a clickable link and a QR code, plus
 * notes; each only if there is one.
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
  const bank = bankLines(payment)
  return (
    <View style={{ gap: 14 }}>
      {(instructions || payment.link || qr || methods.length > 0 || bank.length > 0) && (
        <View>
          <Text style={headingStyle}>Payment</Text>
          {methods.length > 0 ? (
            <Text style={textStyle}>Accepted: {methods.join(' · ')}</Text>
          ) : null}
          {cheques ? <Text style={textStyle}>Cheques payable to {payableTo}</Text> : null}
          {bank.map((line) => (
            <Text key={line} style={textStyle}>
              {line}
            </Text>
          ))}
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

/**
 * Stamp and signature over a line labelled "Authorised signature", at the right of the page.
 * With neither image, the line is left for signing by hand.
 */
export function SignatureBlock({
  signed,
  signature,
  stamp,
  name,
  align = 'right',
}: {
  signed: boolean
  signature: Logo | null
  stamp: Logo | null
  /** The business signing, printed as "For Acme Studio". */
  name: string
  align?: 'left' | 'right'
}) {
  if (!signed) return null
  return (
    <View
      wrap={false}
      style={{ alignSelf: align === 'left' ? 'flex-start' : 'flex-end', width: 190, marginTop: 10 }}
    >
      <View
        style={{
          height: 56,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        {stamp && <LogoImage logo={stamp} maxWidth={80} maxHeight={56} />}
        {signature && (
          <View style={{ marginLeft: stamp ? -24 : 0, marginBottom: 4 }}>
            <LogoImage logo={signature} maxWidth={120} maxHeight={42} />
          </View>
        )}
      </View>
      <View style={{ borderTopWidth: 0.75, borderTopColor: INK, marginTop: 4, paddingTop: 4 }}>
        <Text
          style={{
            fontFamily: FONTS.sans,
            fontSize: 7,
            fontWeight: 600,
            color: INK,
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          Authorised signature
        </Text>
        {name ? (
          <Text
            style={{
              fontFamily: FONTS.sans,
              fontSize: 7.5,
              color: MUTED,
              textAlign: 'center',
              marginTop: 2,
            }}
          >
            For {name}
          </Text>
        ) : null}
      </View>
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
