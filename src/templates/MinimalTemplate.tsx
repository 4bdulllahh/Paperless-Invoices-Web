import { Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { FONTS } from './fonts'
import {
  cellStyle,
  cellText,
  HAIRLINE,
  INK,
  itemColumns,
  MUTED,
  partyLines,
  type TemplateProps,
} from './layout'
import { LogoImage, PageFooter, PartyBlock, PaymentAndNotes } from './shared'

const PAD = 56

const s = StyleSheet.create({
  page: {
    fontFamily: FONTS.sans,
    fontSize: 8.5,
    color: INK,
    paddingTop: PAD,
    paddingBottom: 64,
    paddingHorizontal: PAD,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  businessName: { fontWeight: 600, fontSize: 10 },
  muted: { color: MUTED },
  title: { fontSize: 30, marginTop: 44, letterSpacing: -0.5 },
  facts: { flexDirection: 'row', gap: 36, marginTop: 14 },
  label: {
    fontSize: 7,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  value: { fontWeight: 600 },
  billTo: { marginTop: 28 },
  partyName: { fontWeight: 600, marginBottom: 1 },
  table: { marginTop: 36 },
  headRow: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 0.75,
    borderBottomColor: INK,
  },
  headText: { fontSize: 7, color: MUTED, textTransform: 'uppercase', letterSpacing: 1.2 },
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: HAIRLINE,
  },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', gap: 40, marginTop: 20 },
  notes: { flex: 1 },
  heading: {
    fontSize: 7,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  // react-pdf resolves a unitless lineHeight against this element's own fontSize, so set both.
  body: { fontSize: 8.5, lineHeight: 1.5 },
  link: { color: INK, textDecoration: 'underline', marginTop: 3 },
  totals: { width: 200 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5 },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    marginTop: 2,
    borderTopWidth: 0.5,
    borderTopColor: HAIRLINE,
  },
  balance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.75,
    borderTopColor: INK,
  },
  balanceText: { fontWeight: 600, fontSize: 12 },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: PAD,
    right: PAD,
    fontSize: 7,
    color: MUTED,
    textAlign: 'right',
  },
})

export function MinimalTemplate({ view, logo, payment }: TemplateProps) {
  const columns = itemColumns(view)
  const balance = view.totals.find((row) => row.kind === 'balance')!
  const summary = view.totals.filter((row) => row.kind !== 'balance')

  return (
    <Page size="A4" style={s.page}>
      <View style={s.top}>
        <View>
          {view.from.name ? <Text style={s.businessName}>{view.from.name}</Text> : null}
          {partyLines(view.from).map((line, i) => (
            <Text key={i} style={s.muted}>
              {line}
            </Text>
          ))}
        </View>
        {logo && <LogoImage logo={logo} maxWidth={110} maxHeight={40} />}
      </View>

      <Text style={s.title}>Invoice</Text>
      <View style={s.facts}>
        {[
          ['Number', view.number],
          ['Issued', view.issueDate],
          ['Due', view.dueDate],
        ].map(([label, value]) => (
          <View key={label}>
            <Text style={s.label}>{label}</Text>
            <Text style={s.value}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={s.billTo}>
        <Text style={s.label}>Bill to</Text>
        <PartyBlock party={view.to} nameStyle={s.partyName} lineStyle={s.muted} />
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
              <Text key={column.key} style={cellStyle(column)}>
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
            notes={view.notes}
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
              <Text style={s.muted}>{row.label}</Text>
              <Text>{row.value}</Text>
            </View>
          ))}
          <View style={s.balance}>
            <Text style={s.balanceText}>{balance.label}</Text>
            <Text style={s.balanceText}>{balance.value}</Text>
          </View>
        </View>
      </View>

      <PageFooter number={view.number} style={s.footer} />
    </Page>
  )
}
