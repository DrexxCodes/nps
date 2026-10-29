import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge, PaymentBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LiveOrders } from "@/components/student/LiveOrders";
import { PageTitle } from "@/components/ui/States";
import { formatNaira } from "@/lib/money";
import { derivedAcademicYear, getUserDoc } from "@/lib/server/profile";
import { trackedOrdersForUser, transactionsForUser } from "@/lib/server/queries";
import { requirePageUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";
import { isPurchasable } from "@/lib/item-status";
import { toStudentItem } from "@/lib/pricing";
import { syncItemStatuses, toItem } from "@/lib/server/items";
import { db } from "@/lib/server/firebase-admin";
import { ItemCard } from "@/components/items/ItemCard";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requirePageUser();
  const [u, settings, orders, txns, itemsSnap] = await Promise.all([
    getUserDoc(user.uid), getPlatformSettings(), trackedOrdersForUser(user.uid), transactionsForUser(user.uid),
    db().collection("items").where("status", "in", ["ACTIVE", "SCHEDULED"]).get(),
  ]);
  if (!u) return null;
  const year = derivedAcademicYear(u.admissionNumber, settings);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: settings.schoolTimezone, month: "2-digit", day: "2-digit" }).format(new Date());
  const birthday = typeof u.dateOfBirth === "string" && u.dateOfBirth.slice(5) === today;
  const steps = [!!u.profileImageUrl, !!u.admissionNumber, !!u.bio, !!u.stateOfOrigin, u.emergencyContacts?.length > 0];
  const completion = Math.round((steps.filter(Boolean).length / steps.length) * 100);
  const items = (await syncItemStatuses(itemsSnap.docs.map(toItem))).filter((i) => isPurchasable(i)).slice(0, 3).map((i) => toStudentItem(i, year));

  return (
    <>
      <PageTitle title={`Welcome, ${u.fullName.split(" ")[0]}`} subtitle={year && year > 0 ? `Year ${year} · ${u.admissionNumber}` : "Admission number pending"} />
      {birthday && <Card className="mb-5 border-[var(--accent)] text-lg font-semibold">Happy Birthday, {u.fullName.split(" ")[0]}! 🎉</Card>}
      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm text-[var(--muted)]">Profile completion</p><p className="mt-1 font-display text-3xl font-bold">{completion}%</p><div className="mt-3 h-2 rounded-full bg-[var(--line)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${completion}%` }} /></div><Link href="/dashboard/settings" className="mt-3 inline-block text-sm text-[var(--accent)] hover:underline">Update profile</Link></Card>
        <Card><p className="text-sm text-[var(--muted)]">Admission number</p>{u.admissionNumber ? <p className="mt-1 font-display text-2xl font-bold">{u.admissionNumber}</p> : <><Badge tone="amber">Awaiting</Badge><p className="mt-2 text-sm">Add it in <Link className="text-[var(--accent)] hover:underline" href="/dashboard/settings">settings</Link> to unlock your public profile.</p></>}</Card>
        <Card><p className="text-sm text-[var(--muted)]">Public profile</p>{u.admissionNumber ? <Link href={`/st/${u.admissionNumber}`} className="mt-2 inline-flex items-center gap-1 font-semibold text-[var(--accent)]">View my page <ArrowRight className="size-4" /></Link> : <p className="mt-2 text-sm">Available once you add your admission number.</p>}</Card>
      </div>

      <h2 className="mb-3 mt-8 font-display text-xl font-bold">Recent orders</h2>
      <LiveOrders initial={orders.slice(0, 3)} compact limit={3} />

      <h2 className="mb-3 mt-8 font-display text-xl font-bold">Recent payments</h2>
      {txns.length === 0 ? <p className="text-sm text-[var(--muted)]">No payments yet.</p> : <div className="space-y-2">{txns.slice(0, 3).map((t) => <Card key={t.id} className="flex items-center justify-between py-3"><span className="text-sm">{t.itemNameSnapshot}</span><span className="flex items-center gap-3"><b>{formatNaira(t.amountKobo)}</b><PaymentBadge status={t.status} /></span></Card>)}</div>}

      {items.length > 0 && <><h2 className="mb-3 mt-8 font-display text-xl font-bold">Available now</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((i) => <ItemCard key={i.id} item={i} />)}</div></>}
    </>
  );
}
