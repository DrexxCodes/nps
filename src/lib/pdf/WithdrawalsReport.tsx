import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

/** Everything about one item's money: balances, every settlement day and every withdrawal request. Values arrive pre-formatted. */
export interface WithdrawalsReportData {
  itemName: string;
  owner: string;
  exporter: string;
  generatedAt: string;
  holdHours: number;
  summary: [label: string, value: string][];
  days: { day: string; amount: string; payments: number; state: string }[];
  withdrawals: { requestedAt: string; amount: string; status: string; bank: string; accountNumber: string; accountName: string; requestedBy: string; processedAt: string; reference: string; note: string }[];
}

const s = StyleSheet.create({
  page: { paddingTop: 84, paddingBottom: 52, paddingHorizontal: 32, fontSize: 8.5, fontFamily: "Helvetica", color: "#0e1a14" },
  header: { position: "absolute", top: 24, left: 32, right: 32, borderBottom: "1pt solid #1f9d63", paddingBottom: 8 },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#0b3d2e" },
  meta: { fontSize: 8, color: "#4b5f54", marginTop: 2 },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: "#4b5f54" },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#0b3d2e", marginTop: 14, marginBottom: 6 },
  summary: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  box: { width: "19%", border: "0.5pt solid #c9d6ce", borderRadius: 4, padding: 6 },
  boxLabel: { fontSize: 7.5, color: "#4b5f54" },
  boxValue: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 2 },
  headRow: { flexDirection: "row", backgroundColor: "#0b3d2e", color: "#fff" },
  row: { flexDirection: "row", borderBottom: "0.5pt solid #c9d6ce", minHeight: 22 },
  cell: { padding: 4, justifyContent: "center" },
});

type Col = { key: string; label: string; w: string };
const dayCols: Col[] = [{ key: "day", label: "Settlement day", w: "25%" }, { key: "amount", label: "Collected", w: "25%" }, { key: "payments", label: "Payments", w: "15%" }, { key: "state", label: "Status", w: "35%" }];
const wCols: Col[] = [
  { key: "requestedAt", label: "Requested", w: "11%" }, { key: "amount", label: "Amount", w: "9%" }, { key: "status", label: "Status", w: "8%" }, { key: "bank", label: "Bank", w: "12%" },
  { key: "accountNumber", label: "Account no.", w: "9%" }, { key: "accountName", label: "Account name", w: "15%" }, { key: "requestedBy", label: "Requested by", w: "11%" },
  { key: "processedAt", label: "Handled", w: "11%" }, { key: "reference", label: "Reference / reason", w: "14%" },
];

function Table<T extends Record<string, string | number>>({ cols, rows }: { cols: Col[]; rows: T[] }) {
  return (
    <View>
      <View style={s.headRow} fixed>{cols.map((c) => <Text key={c.key} style={[s.cell, { width: c.w, fontFamily: "Helvetica-Bold" }]}>{c.label}</Text>)}</View>
      {rows.map((r, i) => <View key={i} style={s.row} wrap={false}>{cols.map((c) => <Text key={c.key} style={[s.cell, { width: c.w }]}>{String(r[c.key] ?? "")}</Text>)}</View>)}
    </View>
  );
}

export function WithdrawalsReport({ data }: { data: WithdrawalsReportData }) {
  const withdrawals = data.withdrawals.map((w) => ({ ...w, reference: [w.reference, w.note].filter(Boolean).join(" · ") }));
  return (
    <Document title={`${data.itemName} - withdrawals`} author="NPS (NAPSS Payment Suite)">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header} fixed>
          <Text style={s.title}>{data.itemName} · Withdrawals</Text>
          <Text style={s.meta}>Generated from NPS (NAPSS Payment Suite) · Exported by {data.exporter} · {data.generatedAt}</Text>
          <Text style={s.meta}>Current owner: {data.owner} · Hold period: {data.holdHours} hour(s) after each day&apos;s last payment</Text>
        </View>

        <Text style={s.h2}>Balances</Text>
        <View style={s.summary}>{data.summary.map(([l, v]) => <View key={l} style={s.box}><Text style={s.boxLabel}>{l}</Text><Text style={s.boxValue}>{v}</Text></View>)}</View>

        <Text style={s.h2}>Withdrawal requests ({data.withdrawals.length})</Text>
        {withdrawals.length ? <Table cols={wCols} rows={withdrawals} /> : <Text>No withdrawal requests yet.</Text>}

        <Text style={s.h2} break>Collections by settlement day ({data.days.length})</Text>
        {data.days.length ? <Table cols={dayCols} rows={data.days} /> : <Text>No payments yet.</Text>}

        <View style={s.footer} fixed>
          <Text>Developed by Drexx Technologies · All rights reserved to NAPSS, UNIZIK</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
