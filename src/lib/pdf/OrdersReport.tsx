import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { layoutColumns, type ReportColumn } from "./columns";

/** `options` maps variable-set id -> the student's chosen value(s), e.g. { "a1b2": "M" } or { "c3d4": "Red, Blue" }. */
export interface ReportRow { name: string; academicYear: string; amount: string; admissionNumber: string; paidAt: string; options: Record<string, string> }
/** One item's paid orders. Each section gets its own pages because every item can have different variable sets (columns). */
export interface ReportSection { itemName: string; columns: ReportColumn[]; rows: ReportRow[] }
export interface ReportMeta { title: string; exporter: string; generatedAt: string; filters: string }

const s = StyleSheet.create({
  page: { paddingTop: 96, paddingBottom: 56, paddingHorizontal: 32, fontSize: 9, fontFamily: "Helvetica", color: "#0e1a14" },
  header: { position: "absolute", top: 24, left: 32, right: 32, borderBottom: "1pt solid #1f9d63", paddingBottom: 8 },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#0b3d2e" },
  meta: { fontSize: 8, color: "#4b5f54", marginTop: 2 },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: "#4b5f54" },
  headRow: { flexDirection: "row", backgroundColor: "#0b3d2e", color: "#fff" },
  row: { flexDirection: "row", borderBottom: "0.5pt solid #c9d6ce", minHeight: 30 },
  cell: { padding: 5, justifyContent: "center" },
  sideBorder: { borderLeft: "0.5pt solid #c9d6ce" },
});

const cellText = (key: string, kind: string, row: ReportRow, columns: ReportColumn[]): string => {
  if (kind === "notes") return "";
  if (kind === "variant") return row.options[key] || "-";
  if (kind === "options") return columns.map((c) => (row.options[c.id] ? `${c.label}: ${row.options[c.id]}` : "")).filter(Boolean).join("\n") || "-";
  return row[key as "name" | "academicYear" | "amount" | "admissionNumber" | "paidAt"];
};

export function OrdersReport({ meta, sections }: { meta: ReportMeta; sections: ReportSection[] }) {
  return (
    <Document title={`${meta.title} - NPS report`} author="NPS (NAPSS Payment Suite)">
      {sections.map((sec, n) => {
        const cols = layoutColumns(sec.columns);
        return (
          <Page key={n} size="A4" orientation="landscape" style={s.page}>
            <View style={s.header} fixed>
              <Text style={s.title}>{sec.itemName}</Text>
              <Text style={s.meta}>Generated from NPS (NAPSS Payment Suite) · Exported by {meta.exporter} · {meta.generatedAt}</Text>
              <Text style={s.meta}>{meta.filters}</Text>
            </View>
            <View style={s.headRow} fixed>
              {cols.map((c) => <Text key={c.key} style={[s.cell, { width: c.w, fontFamily: "Helvetica-Bold" }, ...(c.kind === "variant" || c.kind === "options" ? [s.sideBorder] : [])]}>{c.label}</Text>)}
            </View>
            {sec.rows.map((r, i) => (
              <View key={i} style={s.row} wrap={false}>
                {cols.map((c) => <Text key={c.key} style={[s.cell, { width: c.w }, ...(c.kind === "notes" || c.kind === "variant" || c.kind === "options" ? [s.sideBorder] : [])]}>{cellText(c.key, c.kind, r, sec.columns)}</Text>)}
              </View>
            ))}
            {sec.rows.length === 0 && <Text style={{ marginTop: 16 }}>No paid orders match these filters.</Text>}
            <View style={s.footer} fixed>
              <Text>Developed by Drexx Technologies · All rights reserved to NAPSS, UNIZIK</Text>
              <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
