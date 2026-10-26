export interface ReportColumn { id: string; label: string }
export interface PdfColumn { key: string; label: string; w: string; kind: "fixed" | "variant" | "options" | "notes" }

/** Up to this many variable sets get a column each; more are folded into one "Options" column so the table stays readable. */
export const MAX_SET_COLUMNS = 3;

const pct = (n: number) => `${n}%`;

/**
 * Column layout for the orders PDF (widths always total 100%). With no variable sets this is the original six-column
 * layout. Otherwise the fixed columns tighten slightly to make room, and "Notes" always keeps a usable writing area.
 */
export function layoutColumns(sets: ReportColumn[]): PdfColumn[] {
  const f = (key: string, label: string, w: number): PdfColumn => ({ key, label, w: pct(w), kind: key === "notes" ? "notes" : "fixed" });
  if (sets.length === 0) return [f("name", "Student name", 24), f("academicYear", "Year", 7), f("amount", "Amount paid", 12), f("admissionNumber", "Admission no.", 14), f("paidAt", "Payment date", 15), f("notes", "Notes", 28)];

  const base = [f("name", "Student name", 18), f("academicYear", "Year", 5), f("amount", "Amount paid", 10), f("admissionNumber", "Admission no.", 12), f("paidAt", "Payment date", 11)]; // 56%
  if (sets.length > MAX_SET_COLUMNS) return [...base, { key: "options", label: "Options", w: pct(30), kind: "options" }, f("notes", "Notes", 14)];

  const each = Math.min(18, Math.floor(30 / sets.length));
  return [...base, ...sets.map((s): PdfColumn => ({ key: s.id, label: s.label, w: pct(each), kind: "variant" })), f("notes", "Notes", 44 - each * sets.length)];
}
