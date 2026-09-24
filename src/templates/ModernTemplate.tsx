import { Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { FONTS } from './fonts'
import {
  CREAM,
  cellStyle,
  cellText,
  HAIRLINE,
  INK,
  itemColumns,
  MUTED,
  OLIVE,
  PAPER_TINT,
  SAND,
  type TemplateProps,
} from './layout'
import {
  LogoImage,
  PageFooter,
  PartyBlock,
  PaymentAndNotes,
  SignatureBlock,
  TotalInWords,
} from './shared'

const PAD = 40

const s = StyleSheet.create({
  page: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    color: INK,
    paddingTop: PAD,
    paddingBottom: 56,
    paddingHorizontal: PAD,
  },
  band: {
    backgroundColor: INK,
    marginTop: -PAD,
    marginHorizontal: -PAD,
    paddingHorizontal: PAD,
    paddingTop: 34,
    paddingBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: 300 },
  logoTile: { backgroundColor: '#ffffff', borderRadius: 8, padding: 6 },
  businessName: { fontFamily: FONTS.display, fontWeight: 700, fontSize: 15, color: CREAM },
  title: {
    fontFamily: FONTS.display,
    fontWeight: 700,
    fontSize: 26,
    color: CREAM,
    textAlign: 'right',
  },
  number: { color: SAND, fontSize: 10, textAlign: 'right', marginTop: 2 },
  meta: { flexDirection: 'row', gap: 10, marginTop: 22 },
  metaCell: { flex: 1, borderRadius: 8, backgroundColor: PAPER_TINT, padding: 10 },
  metaDue: { flex: 1.3, borderRadius: 8, padding: 10 },
  label: {
    fontSize: 7,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 3,
  },
  labelOnAccent: {
    fontSize: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 3,
  },
  metaValue: { fontFamily: FONTS.display, fontWeight: 500, fontSize: 11 },
  metaDueValue: { fontFamily: FONTS.display, fontWeight: 700, fontSize: 14 },
  parties: { flexDirection: 'row', gap: 24, marginTop: 24 },
  party: { flex: 1 },
  partyName: { fontFamily: FONTS.display, fontWeight: 700, fontSize: 11, marginBottom: 2 },
  partyLine: { color: OLIVE },
  table: { marginTop: 26 },
  headRow: {
    flexDirection: 'row',
    backgroundColor: PAPER_TINT,
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  headText: { fontSize: 7, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.9 },
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 0.75,
    borderBottomColor: HAIRLINE,
  },
  amount: { fontWeight: 600 },
  bottom: { flexDirection: 'row', gap: 28, marginTop: 18 },
  notes: { flex: 1 },
  heading: { fontFamily: FONTS.display, fontWeight: 700, fontSize: 9.5, marginBottom: 3 },
  // react-pdf resolves a unitless lineHeight against this element's own fontSize, so set both.
  body: { color: OLIVE, fontSize: 9, lineHeight: 1.45 },
  link: { color: INK, textDecoration: 'underline', marginTop: 3 },
  totals: { width: 220 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  totalLabel: { color: OLIVE },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 3,
    borderTopWidth: 0.75,
    borderTopColor: SAND,
    fontWeight: 600,
  },
  balance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  balanceText: { fontFamily: FONTS.display, fontWeight: 700, fontSize: 12 },
  words: { marginTop: 12, fontSize: 8.5, color: OLIVE },
  wordsLabel: { fontWeight: 600 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: PAD,
    right: PAD,
    fontSize: 7.5,
    color: MUTED,
    textAlign: 'right',
  },
})

export function ModernTemplate({ view, logo, payment, qr, signature, stamp }: TemplateProps) {
  const columns = itemColumns(view, 495)
  const balance = view.totals.find((row) => row.kind === 'balance')!
  const summary = view.totals.filter((row) => row.kind !== 'balance')
  const { theme } = view
  const onAccent = { color: theme.onAccent }

  return (
    <Page size="A4" style={s.page}>
      <View style={s.band}>
        <View style={s.brand}>
          {logo && (
            <View style={s.logoTile}>
              <LogoImage logo={logo} maxWidth={90} maxHeight={40} />
            </View>
          )}
          {view.from.name ? <Text style={s.businessName}>{view.from.name}</Text> : null}
        </View>
        <View>
          <Text style={s.title}>{view.title}</Text>
          <Text style={s.number}>{view.number}</Text>
        </View>
      </View>

      <View style={s.meta}>
        {view.facts.map((fact) => (
          <View key={fact.label} style={s.metaCell}>
            <Text style={s.label}>{fact.label}</Text>
            <Text style={s.metaValue}>{fact.value}</Text>
          </View>
        ))}
        <View style={[s.metaDue, { backgroundColor: theme.accent }]}>
          <Text style={[s.labelOnAccent, onAccent]}>Balance due</Text>
          <Text style={[s.metaDueValue, onAccent]}>{view.balanceDue}</Text>
        </View>
      </View>

      <View style={s.parties}>
        <View style={s.party}>
          <Text style={s.label}>From</Text>
          <PartyBlock party={view.from} nameStyle={s.partyName} lineStyle={s.partyLine} />
        </View>
        <View style={s.party}>
          <Text style={s.label}>Bill to</Text>
          <PartyBlock party={view.to} nameStyle={s.partyName} lineStyle={s.partyLine} />
        </View>
      </View>

      <View style={s.table}>
        <View style={s.headRow} fixed>
          {columns.map((column) => (
            <Text key={column.key} style={[s.headText, cellStyle(column)]}>
              {column.label}
            </Text>
          ))}
        </View>
        {view.lines.map((line) => (
          <View key={line.id} style={s.row} wrap={false}>
            {columns.map((column) => (
              <Text key={column.key} style={[cellStyle(column), column.strong ? s.amount : {}]}>
                {cellText(line, column)}
              </Text>
            ))}
          </View>
        ))}
      </View>

      <View style={s.bottom} wrap={false}>
        <View style={s.notes}>
          <TotalInWords
            text={view.totalInWords}
            style={{ ...s.words, marginTop: 0, marginBottom: 12 }}
            labelStyle={s.wordsLabel}
          />
          <PaymentAndNotes
            payment={payment}
            qr={qr}
            notes={view.notes}
            payableTo={view.from.name}
            headingStyle={s.heading}
            textStyle={s.body}
            linkStyle={s.link}
          />
        </View>
        <View style={s.totals}>
          {summary.map((row) => (
            <View
              key={`${row.kind}-${row.label}`}
              style={row.kind === 'total' ? s.grandTotal : s.totalRow}
            >
              <Text style={row.kind === 'total' ? {} : s.totalLabel}>{row.label}</Text>
              <Text>{row.value}</Text>
            </View>
          ))}
          <View style={[s.balance, { backgroundColor: theme.accent }]}>
            <Text style={[s.balanceText, onAccent]}>{balance.label}</Text>
            <Text style={[s.balanceText, onAccent]}>{balance.value}</Text>
          </View>
          <SignatureBlock
            signed={view.signed}
            signature={signature}
            stamp={stamp}
            name={view.from.name}
          />
        </View>
      </View>

      <PageFooter number={view.number} style={s.footer} />
    </Page>
  )
}
