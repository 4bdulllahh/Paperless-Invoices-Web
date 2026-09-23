import { Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { FONTS } from './fonts'
import {
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
import { LogoImage, PageFooter, PartyBlock, PaymentAndNotes, TotalInWords } from './shared'

const PAD = 32

/** Compact: small type, boxed details and striped rows, so long item lists fit on fewer pages. */
const s = StyleSheet.create({
  page: {
    fontFamily: FONTS.sans,
    fontSize: 8,
    color: INK,
    paddingTop: PAD,
    paddingBottom: 48,
    paddingHorizontal: PAD,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: INK,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  businessName: { fontFamily: FONTS.display, fontWeight: 700, fontSize: 12 },
  title: {
    fontFamily: FONTS.display,
    fontWeight: 700,
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'right',
  },
  boxes: { flexDirection: 'row', gap: 8, marginTop: 10 },
  box: { flex: 1, borderWidth: 0.75, borderColor: SAND, borderRadius: 3, padding: 7 },
  factsBox: { width: 150, borderWidth: 0.75, borderColor: SAND, borderRadius: 3, padding: 7 },
  label: {
    fontSize: 6.5,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  partyName: { fontWeight: 600, marginBottom: 1 },
  partyLine: { color: OLIVE },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  factLabel: { color: MUTED },
  table: { marginTop: 10, borderWidth: 0.75, borderColor: SAND, borderRadius: 3 },
  headRow: {
    flexDirection: 'row',
    backgroundColor: PAPER_TINT,
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderBottomWidth: 0.75,
    borderBottomColor: SAND,
  },
  headText: { fontSize: 6.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8 },
  row: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 7 },
  stripe: { backgroundColor: '#faf7f0' },
  rowRule: { borderTopWidth: 0.5, borderTopColor: HAIRLINE },
  amount: { fontWeight: 600 },
  bottom: { flexDirection: 'row', gap: 16, marginTop: 10 },
  notes: { flex: 1 },
  heading: { fontWeight: 600, fontSize: 8, marginBottom: 2 },
  body: { color: OLIVE, fontSize: 8, lineHeight: 1.4 },
  link: { color: INK, textDecoration: 'underline', marginTop: 2 },
  totals: {
    width: 200,
    alignSelf: 'flex-start',
    borderWidth: 0.75,
    borderColor: SAND,
    borderRadius: 3,
    padding: 7,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1.5 },
  totalLabel: { color: OLIVE },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    marginTop: 2,
    borderTopWidth: 0.75,
    borderTopColor: SAND,
    fontWeight: 600,
  },
  balance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1.5,
    borderTopColor: INK,
  },
  balanceText: { fontFamily: FONTS.display, fontWeight: 700, fontSize: 10 },
  words: { marginTop: 8, fontSize: 7.5, color: OLIVE },
  wordsLabel: { fontWeight: 600, color: INK },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: PAD,
    right: PAD,
    fontSize: 7,
    color: MUTED,
    textAlign: 'center',
  },
})

export function CompactTemplate({ view, logo, payment, qr }: TemplateProps) {
  const columns = itemColumns(view)
  const balance = view.totals.find((row) => row.kind === 'balance')!
  const summary = view.totals.filter((row) => row.kind !== 'balance')

  return (
    <Page size="A4" style={s.page}>
      <View style={s.top}>
        <View style={s.brand}>
          {logo && <LogoImage logo={logo} maxWidth={80} maxHeight={32} />}
          {view.from.name ? <Text style={s.businessName}>{view.from.name}</Text> : null}
        </View>
        <Text style={s.title}>{view.title}</Text>
      </View>

      <View style={s.boxes}>
        <View style={s.box}>
          <Text style={s.label}>From</Text>
          <PartyBlock
            party={{ ...view.from, name: '' }}
            nameStyle={s.partyName}
            lineStyle={s.partyLine}
          />
        </View>
        <View style={s.box}>
          <Text style={s.label}>Bill to</Text>
          <PartyBlock party={view.to} nameStyle={s.partyName} lineStyle={s.partyLine} />
        </View>
        <View style={s.factsBox}>
          {[
            ['Number', view.number],
            ['Issued', view.issueDate],
            ['Due', view.dueDate],
            [balance.label, view.balanceDue],
          ].map(([label, value]) => (
            <View key={label} style={s.factRow}>
              <Text style={s.factLabel}>{label}</Text>
              <Text style={s.amount}>{value}</Text>
            </View>
          ))}
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
        {view.lines.map((line, index) => (
          <View
            key={line.id}
            style={[s.row, index % 2 ? s.stripe : {}, index > 0 ? s.rowRule : {}]}
            wrap={false}
          >
            {columns.map((column) => (
              <Text
                key={column.key}
                style={[cellStyle(column), column.key === 'amount' ? s.amount : {}]}
              >
                {cellText(line, column)}
              </Text>
            ))}
          </View>
        ))}
      </View>

      <View style={s.bottom} wrap={false}>
        <View style={s.notes}>
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
          <View style={s.balance}>
            <Text style={s.balanceText}>{balance.label}</Text>
            <Text style={s.balanceText}>{balance.value}</Text>
          </View>
        </View>
      </View>

      <TotalInWords text={view.totalInWords} style={s.words} labelStyle={s.wordsLabel} />

      <PageFooter number={view.number} style={s.footer} />
    </Page>
  )
}
