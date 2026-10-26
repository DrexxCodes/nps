import { ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { balanceFor } from "@/lib/server/ledger";
import { ADMIN_ROLES, requireUser } from "@/lib/server/session";

/**
 * Read-only for now: ledger-backed balance + withdrawal history. Transfer initiation is intentionally NOT
 * implemented until Paystack's transfer/settlement model is verified for this account (PRD section 23).
 */
export const GET = route(async (req: Request) => {
  const user = await requireUser(req, ADMIN_ROLES);
  const q = user.role === "SUPER_ADMIN" ? db().collection("withdrawals") : db().collection("withdrawals").where("ownerAdminId", "==", user.uid);
  const history = (await q.get()).docs.map((d) => {
    const w = d.data();
    return { id: d.id, itemId: w.itemId, amountKobo: w.amountKobo, status: w.status, requestedAt: w.requestedAt, processedAt: w.processedAt ?? null, providerReference: w.providerReference ?? null,
      destination: w.destinationAccountSnapshot ? { name: w.destinationAccountSnapshot.accountName, masked: `******${String(w.destinationAccountSnapshot.accountNumber).slice(-4)}` } : null };
  });
  return ok({ balance: await balanceFor(user.uid), history, transfersEnabled: false });
});
