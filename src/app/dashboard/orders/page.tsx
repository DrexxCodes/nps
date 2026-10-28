import { redirect } from "next/navigation";
import { LiveOrders } from "@/components/student/LiveOrders";
import { PageTitle } from "@/components/ui/States";
import { trackedOrdersForUser } from "@/lib/server/queries";
import { requirePageUser } from "@/lib/server/session";

export const metadata = { title: "My orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  const user = await requirePageUser();
  const { reference, trxref } = await searchParams;
  // Payments started before the receipt page existed still return here: send them to the receipt, which confirms and shows it.
  const ref = reference ?? trxref;
  if (ref && /^NAPSS-NAU-\d+-[A-Z]{2,}$/.test(ref)) redirect(`/dashboard/receipt?reference=${ref}`);
  return (
    <>
      <PageTitle title="My orders" subtitle="Track each order from payment to pickup. This page updates by itself." />
      <LiveOrders initial={await trackedOrdersForUser(user.uid)} />
    </>
  );
}
