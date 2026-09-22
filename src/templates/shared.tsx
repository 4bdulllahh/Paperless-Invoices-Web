import { Image, Link, Text, View } from '@react-pdf/renderer'
import type { Logo, PaymentDetails } from '../domain/records'
import type { PartyView } from '../domain/viewModel'
import { partyLines, type Style } from './layout'

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

/** Payment instructions (and a clickable link) plus notes, if there are any. */
export function PaymentAndNotes({
  payment,
  notes,
  headingStyle,
  textStyle,
  linkStyle,
}: {
  payment: PaymentDetails
  notes: string
  headingStyle: Style
  textStyle: Style
  linkStyle: Style
}) {
  const instructions = payment.instructions.trim()
  return (
    <View style={{ gap: 14 }}>
      {(instructions || payment.link) && (
        <View>
          <Text style={headingStyle}>Payment</Text>
          {instructions ? <Text style={textStyle}>{instructions}</Text> : null}
          {payment.link ? (
            <Link src={payment.link} style={linkStyle}>
              {payment.link}
            </Link>
          ) : null}
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
