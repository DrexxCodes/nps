import { notFound, redirect } from "next/navigation";
import { Checkout } from "@/components/items/Checkout";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { isPurchasable } from "@/lib/item-status";
import { toStudentItem } from "@/lib/pricing";
import { loadFreshItem } from "@/lib/server/items";
import { derivedAcademicYear, getUserDoc } from "@/lib/server/profile";
import { avatarSeedOf } from "@/lib/server/public-profile";
import { getSessionUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export default async function ItemPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/items/${itemId}`)}`); // signed-out visitors never see items or prices
  const loaded = await loadFreshItem(itemId).catch(() => null);
  if (!loaded || loaded.status === "DRAFT") notFound();
  const [profile, settings] = await Promise.all([getUserDoc(user.uid), getPlatformSettings()]);
  if (!isPurchasable(loaded)) return <EmptyState title={loaded.name} body="This item is not open for purchase right now." />;
  // Only this student's class prices ever reach the page; other classes' prices stay on the server.
  const item = toStudentItem(loaded, derivedAcademicYear(profile?.admissionNumber ?? null, settings));
  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-5">
      <Card className="md:col-span-2 h-fit">
        <h1 className="font-display text-2xl font-bold">{item.name}</h1>
        <p className="mt-2 whitespace-pre-line text-sm text-[var(--muted)]">{item.description}</p>
        {item.endAt && <p className="mt-4 text-sm">Closes {new Date(item.endAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>}
      </Card>
      <div className="md:col-span-3">
        <Checkout itemId={item.id} itemName={item.name} hasSubItems={item.hasSubItems} subItems={item.subItems} variantSets={item.variantSets} signedIn studentName={profile?.fullName ?? ""} avatarSeed={avatarSeedOf(profile?.email)} batched={item.batchProcessingEnabled} physical={item.physical} />
      </div>
    </div>
  );
}
