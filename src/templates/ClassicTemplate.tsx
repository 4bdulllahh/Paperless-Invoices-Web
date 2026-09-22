import { Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { FONTS } from './fonts'
import {
  cellStyle,
  cellText,
  INK,
  itemColumns,
  MUTED,
  OLIVE,
  PAPER_TINT,
  partyLines,
  type TemplateProps,
} from './layout'
import { LogoImage, PageFooter, PartyBlock, PaymentAndNotes } from './shared'

const RULE = '#8a847b'

const s = StyleSheet.create({
  page: {
    fontFamily: FONTS.serif,
    fontSize: 9,
    color: INK,
    paddingTop: 44,
    paddingBottom: 60,
    paddingHorizontal: 50,
  },
  letterhead: { alignItems: 'center', gap: 4 },
  businessName: {
    fontWeight: 700,
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    marginTop: 6,
    textAlign: 'center',
  },
  contact: { fontSize: 8.5, color: OLIVE, textAlign: 'center' },
  doubleRule: { marginTop: 14, borderTopWidth: 1.25, borderTopColor: INK, paddingTop: 2 },
  thinRule: { borderTopWidth: 0.5, borderTopColor: INK },
  title: {
    fontSize: 19,
    letterSpacing: 5,
    textAlign: 'center',
    marginTop: 20,
    textTransform: 'uppercase',
  },
  details: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22, gap: 30 },
  billTo: { flex: 1 },
  label: { fontStyle: 'italic', color: MUTED, marginBottom: 3 },
  partyName: { fontWeight: 700, fontSize: 10.5, marginBottom: 1 },
  partyLine: { color: OLIVE },
  metaTable: { width: 200 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1.5 },
  metaLabel: { fontStyle: 'italic', color: MUTED },
  metaValue: { fontWeight: 700 },
  table: { marginTop: 24, borderWidth: 0.75, borderColor: INK },
  headRow: {
    flexDirection: 'row',
    backgroundColor: PAPER_TINT,
    borderBottomWidth: 0.75,
    borderBottomColor: INK,
  },
  headText: { fontWeight: 700, fontSize: 8.5, paddingVertical: 6, paddingRight: 8 },
  row: { flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: RULE },
  firstRow: { flexDirection: 'row' },
  cell: { paddingVertical: 6, paddingRight: 8 },
  bottom: { marginTop: 18, flexDirection: 'row', gap: 30 },
  notes: { flex: 1 },
  heading: { fontWeight: 700, fontSize: 9.5, marginBottom: 3 },
  // react-pdf resolves a unitless lineHeight against this element's own fontSize, so set both.
  body: { fontStyle: 'italic', color: OLIVE, fontSize: 9, lineHeight: 1.5 },
  link: { color: INK, textDecoration: 'underline', marginTop: 3 },
  totals: { width: 220, borderWidth: 0.75, borderColor: INK, paddingVertical: 4 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2.5,
    paddingHorizontal: 10,
  },
  totalLabel: { color: OLIVE },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 2,
    borderTopWidth: 0.5,
    borderTopColor: INK,
    fontWeight: 700,
  },
  balance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 3,
    paddingHorizontal: 10,
    marginTop: 3,
    borderTopWidth: 1.25,
    borderTopColor: INK,
  },
  balanceText: { fontWeight: 700, fontSize: 11 },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 50,
    right: 50,
    fontSize: 7.5,
    color: MUTED,
    textAlign: 'center',
    fontStyle: 'italic',
  },
})

export function ClassicTemplate({ view, logo, payment }: TemplateProps) {
  const columns = itemColumns(view)
  const balance = view.totals.find((row) => row.kind === 'balance')!
  const summary = view.totals.filter((row) => row.kind !== 'balance')
  const [address, contact] = [
    view.from.addressLines.join(' · '),
    partyLines({ ...view.from, addressLines: [] }).join(' · '),
  ]

  return (
    <Page size="A4" style={s.page}>
      <View style={s.letterhead}>
        {logo && <LogoImage logo={logo} maxWidth={130} maxHeight={48} />}
        {view.from.name ? <Text style={s.businessName}>{view.from.name}</Text> : null}
        {address ? <Text style={s.contact}>{address}</Text> : null}
        {contact ? <Text style={s.contact}>{contact}</Text> : null}
      </View>
      <View style={s.doubleRule}>
        <View style={s.thinRule} />
      </View>

      <Text style={s.title}>Invoice</Text>

      <View style={s.details}>
        <View style={s.billTo}>
          <Text style={s.label}>Bill to</Text>
          <PartyBlock party={view.to} nameStyle={s.partyName} lineStyle={s.partyLine} />
        </View>
        <View style={s.metaTable}>
          {[
            ['Invoice no.', view.number],
            ['Date', view.issueDate],
            ['Due', view.dueDate],
          ].map(([label, value]) => (
            <View key={label} style={s.metaRow}>
              <Text style={s.metaLabel}>{label}</Text>
              <Text style={s.metaValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.table}>
        <View style={s.headRow} fixed>
          {columns.map((column, i) => (
            <Text
              key={column.key}
              style={[s.headText, cellStyle(column), i === 0 ? { paddingLeft: 8 } : {}]}
            >
              {column.label}
            </Text>
          ))}
        </View>
        {view.lines.map((line, index) => (
          <View key={line.id} style={index === 0 ? s.firstRow : s.row} wrap={false}>
            {columns.map((column, i) => (
              <Text
                key={column.key}
                style={[s.cell, cellStyle(column), i === 0 ? { paddingLeft: 8 } : {}]}
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

      <PageFooter number={view.number} style={s.footer} />
    </Page>
  )
}
