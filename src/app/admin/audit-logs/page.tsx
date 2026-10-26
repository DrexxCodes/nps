import { EmptyState, PageTitle } from "@/components/ui/States";
import { db } from "@/lib/server/firebase-admin";
import { requirePageUser } from "@/lib/server/session";

export const metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

export default async function AuditLogs() {
  await requirePageUser(["SUPER_ADMIN"]);
  const docs = (await db().collection("auditLogs").orderBy("createdAt", "desc").limit(100).get()).docs;
  const ts = (v: unknown) => { const x = v as { toMillis?: () => number } | number | null; return typeof x === "number" ? x : x?.toMillis?.() ?? 0; };
  return (
    <>
      <PageTitle title="Audit log" subtitle="Latest 100 events." />
      {docs.length === 0 ? <EmptyState title="Nothing logged yet" /> : (
        <div className="glass overflow-x-auto rounded-2xl"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b border-[var(--line)] text-xs text-[var(--muted)]"><tr>{["When", "Actor", "Action", "Resource"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>{docs.map((d) => { const a = d.data(); return <tr key={d.id} className="border-b border-[var(--line)] last:border-0"><td className="px-4 py-2.5">{new Date(ts(a.createdAt)).toLocaleString("en-NG")}</td><td className="px-4 py-2.5">{a.actorRole}</td><td className="px-4 py-2.5 font-medium">{a.action}</td><td className="px-4 py-2.5">{a.resourceType}/{String(a.resourceId).slice(0, 12)}</td></tr>; })}</tbody></table></div>
      )}
    </>
  );
}
