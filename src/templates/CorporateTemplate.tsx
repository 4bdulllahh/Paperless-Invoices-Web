import { Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { FONTS } from './fonts'
import {
  cellStyle,
  cellText,
  FLAME,
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

const SIDEBAR = 172
const PAD = 36

/** Corporate: a tinted sidebar with the sender, client and dates; the items get the main column. */
const s = StyleSheet.create({
  page: {
    fontFamily: FONTS.sans,
    fontSize: 9,
    color: INK,
    paddingTop: PAD,
    paddingBottom: 56,
    paddingLeft: SIDEBAR + 30,
    paddingRight: PAD,
  },
  // Repeats on every page, behind the content.
  sidebarTint: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR,
    backgroundColor: PAPER_TINT,
    borderRightWidth: 3,
    borderRightColor: FLAME,
  },
  // First page only.
  sidebar: {
    position: 'absolute',
    top: PAD,
    left: 22,
    width: SIDEBAR - 44,
    gap: 20,
  },
  businessName: { fontFamily: FONTS.display, fontWeight: 700, fontSize: 13 },
  label: {
    fontSize: 7,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  partyName: { fontWeight: 600, marginBottom: 1 },
  partyLine: { color: OLIVE, fontSize: 8.5 },
  fact: { marginBottom: 8 },
  factValue: { fontFamily: FONTS.display, fontWeight: 500, fontSize: 10 },
  title: { fontFamily: FONTS.display, fontWeight: 700, fontSize: 28, color: INK },
  number: { fontSize: 10, color: MUTED, marginTop: 2 },
  table: { marginTop: 28 },
  headRow: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: INK,
  },
  headText: { fontSize: 7, color: MUTED, textTransform: 'uppercase', letterSpacing: 1 },
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 0.75,
    borderBottomColor: HAIRLINE,
  },
  amount: { fontWeight: 600 },
  totals: { marginTop: 16, marginLeft: 'auto', width: 230 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { color: OLIVE },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    marginTop: 3,
    borderTopWidth: 0.75,
    borderTopColor: SAND,
    fontWeight: 600,
  },
  balance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: INK,
    color: '#fffcf2',
  },
  balanceText: { fontFamily: FONTS.display, fontWeight: 700, fontSize: 12 },
  payment: { marginTop: 24 },
  heading: { fontFamily: FONTS.display, fontWeight: 700, fontSize: 9.5, marginBottom: 3 },
  body: { color: OLIVE, fontSize: 9, lineHeight: 1.45 },
  link: { color: INK, textDecoration: 'underline', marginTop: 3 },
  words: { marginTop: 10, fontSize: 8.5, color: OLIVE, textAlign: 'right' },
  wordsLabel: { fontWeight: 600, color: INK },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: SIDEBAR + 30,
    right: PAD,
    fontSize: 7.5,
    color: MUTED,
    textAlign: 'right',
  },
})

export function CorporateTemplate({ view, logo, payment, qr }: TemplateProps) {
  const columns = itemColumns(view)
  const balance = view.totals.find((row) => row.kind === 'balance')!
  const summary = view.totals.filter((row) => row.kind !== 'balance')

  return (
    <Page size="A4" style={s.page}>
      <View style={s.sidebarTint} fixed />
      <View style={s.sidebar}>
        <View>
          {logo && <LogoImage logo={logo} maxWidth={SIDEBAR - 44} maxHeight={50} />}
          {view.from.name ? (
            <Text style={[s.businessName, logo ? { marginTop: 10 } : {}]}>{view.from.name}</Text>
          ) : null}
          <PartyBlock
            party={{ ...view.from, name: '' }}
            nameStyle={s.partyName}
            lineStyle={s.partyLine}
          />
        </View>
        <View>
          <Text style={s.label}>Bill to</Text>
          <PartyBlock party={view.to} nameStyle={s.partyName} lineStyle={s.partyLine} />
        </View>
        <View>
          {[
            ['Issued', view.issueDate],
            ['Due', view.dueDate],
          ].map(([label, value]) => (
            <View key={label} style={s.fact}>
              <Text style={s.label}>{label}</Text>
              <Text style={s.factValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={s.title}>{view.title}</Text>
      <Text style={s.number}>{view.number}</Text>

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

      <View wrap={false}>
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
        <TotalInWords text={view.totalInWords} style={s.words} labelStyle={s.wordsLabel} />
      </View>

      <View style={s.payment} wrap={false}>
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

      <PageFooter number={view.number} style={s.footer} />
    </Page>
  )
}
