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

const PAD = 44

/** Bold: a full-width accent header with an oversized title, and an ink totals block. */
const s = StyleSheet.create({
  page: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    color: INK,
    paddingTop: PAD,
    paddingBottom: 56,
    paddingHorizontal: PAD,
  },
  header: {
    marginTop: -PAD,
    marginHorizontal: -PAD,
    paddingHorizontal: PAD,
    paddingTop: 38,
    paddingBottom: 26,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: {
    fontFamily: FONTS.display,
    fontWeight: 700,
    fontSize: 40,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    lineHeight: 1,
  },
  logoTile: { backgroundColor: '#ffffff', borderRadius: 6, padding: 6 },
  headerFacts: { flexDirection: 'row', gap: 28, marginTop: 18 },
  factLabel: { fontSize: 7, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  factValue: { fontFamily: FONTS.display, fontWeight: 700, fontSize: 11 },
  parties: { flexDirection: 'row', gap: 24, marginTop: 26 },
  party: { flex: 1 },
  label: {
    fontSize: 7,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  partyName: { fontFamily: FONTS.display, fontWeight: 700, fontSize: 12, marginBottom: 2 },
  partyLine: { color: OLIVE },
  due: { alignItems: 'flex-end' },
  dueAmount: { fontFamily: FONTS.display, fontWeight: 700, fontSize: 22 },
  table: { marginTop: 26 },
  headRow: {
    flexDirection: 'row',
    backgroundColor: INK,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  headText: {
    fontSize: 7,
    color: CREAM,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 600,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
  },
  amount: { fontWeight: 600 },
  bottom: { flexDirection: 'row', gap: 28, marginTop: 20 },
  notes: { flex: 1 },
  heading: { fontFamily: FONTS.display, fontWeight: 700, fontSize: 10, marginBottom: 3 },
  body: { color: OLIVE, fontSize: 9, lineHeight: 1.45 },
  link: { color: INK, textDecoration: 'underline', marginTop: 3 },
  totals: { width: 230, alignSelf: 'flex-start', backgroundColor: INK, padding: 14, color: CREAM },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { color: '#ccc5b9' },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: OLIVE,
    fontWeight: 600,
  },
  balance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
  },
  balanceText: { fontFamily: FONTS.display, fontWeight: 700, fontSize: 13 },
  words: { marginTop: 12, fontSize: 8.5, color: OLIVE },
  wordsLabel: { fontWeight: 600, color: INK },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: PAD,
    right: PAD,
    fontSize: 7.5,
    color: MUTED,
  },
})

export function BoldTemplate({ view, logo, payment, qr, signature, stamp }: TemplateProps) {
  const columns = itemColumns(view, 487)
  const balance = view.totals.find((row) => row.kind === 'balance')!
  const summary = view.totals.filter((row) => row.kind !== 'balance')
  const { theme } = view
  const onAccent = { color: theme.onAccent }
  const onInk = { color: theme.accentOnInk }

  return (
    <Page size="A4" style={s.page}>
      <View style={[s.header, { backgroundColor: theme.accent }]}>
        <View style={s.headerTop}>
          <Text style={[s.title, onAccent]}>{view.title}</Text>
          {logo && (
            <View style={s.logoTile}>
              <LogoImage logo={logo} maxWidth={100} maxHeight={44} />
            </View>
          )}
        </View>
        <View style={s.headerFacts}>
          {[['Number', view.number], ...view.facts.map((fact) => [fact.label, fact.value])].map(
            ([label, value]) => (
              <View key={label}>
                <Text style={[s.factLabel, onAccent]}>{label}</Text>
                <Text style={[s.factValue, onAccent]}>{value}</Text>
              </View>
            ),
          )}
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
        <View style={s.due}>
          <Text style={s.label}>{balance.label}</Text>
          <Text style={[s.dueAmount, { color: theme.accentOnPaper }]}>{view.balanceDue}</Text>
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
        <View>
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
            <View style={[s.balance, { borderTopColor: theme.accentOnInk }]}>
              <Text style={[s.balanceText, onInk]}>{balance.label}</Text>
              <Text style={[s.balanceText, onInk]}>{balance.value}</Text>
            </View>
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
