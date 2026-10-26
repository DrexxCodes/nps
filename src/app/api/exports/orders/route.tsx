import { renderToBuffer } from "@react-pdf/renderer";
import { exportSchema } from "@/lib/validation/schemas";
import { formatNaira } from "@/lib/money";
import { OrdersReport, type ReportRow, type ReportSection } from "@/lib/pdf/OrdersReport";
import { audit } from "@/lib/server/audit";
import { AppError, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { itemsForUser } from "@/lib/server/items";
import { derivedAcademicYear, getUserDoc } from "@/lib/server/profile";
import { OPS_ROLES, requireUser } from "@/lib/server/session";
import type { SelectedVariant } from "@/types";
import { getPlatformSettings } from "@/lib/server/settings";

export const runtime = "nodejs";
const MAX_ROWS = 5000;
const LAGOS = "+01:00"; // Africa/Lagos has no DST

export const POST = route(async (req: Request) => {
  const user = await requireUser(req, OPS_ROLES);
  const f = exportSchema.parse(await req.json());
  const scope = await itemsForUser(user); // ownership/assignment is resolved server-side; client ids are only filters
  const items = f.itemId ? scope.filter((i) => i.id === f.itemId) : scope;
  if (f.itemId && !items.length) throw new AppError("FORBIDDEN");

  const from = f.from ? Date.parse(`${f.from}T00:00:00${LAGOS}`) : 0;
  const to = f.to ? Date.parse(`${f.to}T23:59:59.999${LAGOS}`) : Number.MAX_SAFE_INTEGER;
  const settings = await getPlatformSettings();
  const users = new Map<string, Awaited<ReturnType<typeof getUserDoc>>>();
  const sections: ReportSection[] = [];
  let total = 0;

  // One section (own pages) per item: each item has its own variable sets, so its own columns.
  for (const item of items) {
    const rows: ReportRow[] = [];
    const retired = new Map<string, string>(); // sets chosen on older orders that the admin has since removed: still shown, never lost
    const snap = await db().collection("orders").where("itemId", "==", item.id).get();
    for (const d of snap.docs) {
      const o = d.data();
      if (o.paymentStatus !== "SUCCESSFUL" || o.paidAt < from || o.paidAt > to) continue;
      if (f.fulfillment !== "ALL" && o.fulfillmentStatus !== f.fulfillment) continue;
      if (!users.has(o.userId)) users.set(o.userId, await getUserDoc(o.userId));
      const u = users.get(o.userId);
      const options: Record<string, string> = {};
      for (const v of (o.selectedVariants ?? []) as SelectedVariant[]) {
        options[v.setId] = v.options.map((x) => x.label).join(", ");
        if (!item.variantSets.some((set) => set.id === v.setId)) retired.set(v.setId, v.setName);
      }
      rows.push({
        name: u?.fullName ?? "Unknown", admissionNumber: u?.admissionNumber ?? "Pending",
        academicYear: String(derivedAcademicYear(u?.admissionNumber ?? null, settings) ?? "-"), amount: formatNaira(o.totalAmount),
        paidAt: new Date(o.paidAt).toLocaleDateString("en-NG", { timeZone: settings.schoolTimezone, day: "2-digit", month: "short", year: "numeric" }), options,
      });
      if (++total > MAX_ROWS) throw new AppError("VALIDATION_ERROR", { _: `Too many rows (max ${MAX_ROWS}). Narrow the date range.` });
    }
    if (!rows.length) continue;
    rows.sort((a, b) => a.name.localeCompare(b.name));
    const columns = [...item.variantSets.map((set) => ({ id: set.id, label: set.name })), ...[...retired].map(([id, label]) => ({ id, label }))];
    sections.push({ itemName: item.name, columns, rows });
  }
  if (!sections.length) sections.push({ itemName: f.itemId ? items[0]!.name : "All authorized items", columns: [], rows: [] });

  const exporter = (await getUserDoc(user.uid))?.fullName ?? "Unknown";
  const itemName = f.itemId ? items[0]!.name : "All authorized items";
  const filters = [f.from || f.to ? `Dates: ${f.from ?? "start"} to ${f.to ?? "today"}` : "Dates: all", `Fulfillment: ${f.fulfillment.toLowerCase()}`, "Paid orders only"].join(" · ");
  const pdf = await renderToBuffer(
    <OrdersReport meta={{ title: itemName, exporter, filters, generatedAt: new Date().toLocaleString("en-NG", { timeZone: settings.schoolTimezone }) }} sections={sections} />,
  );
  await audit({ actorUid: user.uid, actorRole: user.role, action: "EXPORT_ORDERS", resourceType: "item", resourceId: f.itemId ?? "all", metadata: { rows: total, items: sections.length } });
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="nps-report-${Date.now()}.pdf"`, "Cache-Control": "no-store" } });
});
