import { renderToBuffer } from "@react-pdf/renderer";
import { formatWhen } from "@/lib/wallet";
import { formatNaira } from "@/lib/money";
import { WithdrawalsReport } from "@/lib/pdf/WithdrawalsReport";
import { audit } from "@/lib/server/audit";
import { AppError, route } from "@/lib/server/errors";
import { canManageItem, loadItem } from "@/lib/server/items";
import { getUserDoc } from "@/lib/server/profile";
import { ADMIN_ROLES, requireUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";
import { loadSettlementDays, loadWallet } from "@/lib/server/wallet";
import { allItemWithdrawals } from "@/lib/server/withdrawals";
import { WITHDRAWAL_STATUS_LABEL } from "@/constants/withdrawals";

export const runtime = "nodejs";
export const maxDuration = 60;

/** GET /api/exports/withdrawals?itemId=... : the item's full money record (not limited to the 15 shown on screen). */
export const GET = route(async (req: Request) => {
  const user = await requireUser(req, ADMIN_ROLES);
  const itemId = new URL(req.url).searchParams.get("itemId");
  if (!itemId) throw new AppError("VALIDATION_ERROR", { itemId: "itemId is required" });
  const item = await loadItem(itemId);
  if (!canManageItem(user, item)) throw new AppError("FORBIDDEN");

  const settings = await getPlatformSettings();
  const [wallet, days, withdrawals, owner, exporter] = await Promise.all([
    loadWallet(itemId, settings.withdrawalHoldHours), loadSettlementDays(itemId), allItemWithdrawals(itemId), getUserDoc(item.ownerAdminId), getUserDoc(user.uid),
  ]);
  const b = wallet.balances;
  const pdf = await renderToBuffer(
    <WithdrawalsReport data={{
      itemName: item.name, owner: owner?.fullName ?? "Unknown", exporter: exporter?.fullName ?? "Unknown", generatedAt: formatWhen(Date.now()), holdHours: settings.withdrawalHoldHours,
      summary: [["Collected", formatNaira(b.collectedKobo)], ["Awaiting release", formatNaira(b.awaitingReleaseKobo)], ["Available", formatNaira(b.availableKobo)], ["Requested (open)", formatNaira(b.requestedKobo)], ["Withdrawn", formatNaira(b.withdrawnKobo)]],
      days: days.map((d) => ({ day: d.day, amount: formatNaira(d.amountKobo), payments: d.count, state: d.released ? "Released" : "Held" })),
      withdrawals: withdrawals.map((w) => ({
        requestedAt: formatWhen(w.requestedAt), amount: formatNaira(w.amountKobo), status: WITHDRAWAL_STATUS_LABEL[w.status], bank: w.destination.bankName, accountNumber: w.destination.accountNumber,
        accountName: w.destination.accountName, requestedBy: w.requesterName, processedAt: w.processedAt ? formatWhen(w.processedAt) : "-",
        reference: w.payoutReference ?? w.reason ?? "", note: w.note ?? "",
      })),
    }} />,
  );
  await audit({ actorUid: user.uid, actorRole: user.role, action: "EXPORT_WITHDRAWALS", resourceType: "item", resourceId: itemId, metadata: { withdrawals: withdrawals.length, days: days.length } });
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="nps-withdrawals-${itemId}-${new Date().toISOString().slice(0, 10)}.pdf"`, "Cache-Control": "no-store" } });
});
