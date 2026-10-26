import { pricingFingerprint } from "@/lib/pricing";
import { itemSchema } from "@/lib/validation/schemas";
import { audit } from "@/lib/server/audit";
import { AppError, ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { requireManageItem } from "@/lib/server/items";
import { ADMIN_ROLES, requireUser } from "@/lib/server/session";

type Ctx = { params: Promise<{ itemId: string }> };

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req, ADMIN_ROLES);
  const { itemId } = await ctx.params;
  const item = await requireManageItem(user, itemId);
  if (item.status === "SUSPENDED" && user.role !== "SUPER_ADMIN") throw new AppError("FORBIDDEN");
  const input = itemSchema.parse(await req.json());
  // Lifecycle restriction: pricing structure is frozen once a paid order exists (history is snapshotted, but buyers should not see churn).
  // Class prices count as prices. The fingerprint is normalized so items saved before class pricing existed don't read as "changed".
  const priceChanged = pricingFingerprint(input) !== pricingFingerprint(item);
  if (priceChanged) {
    const paid = await db().collection("orders").where("itemId", "==", itemId).limit(1).get();
    if (!paid.empty && user.role !== "SUPER_ADMIN") throw new AppError("VALIDATION_ERROR", { basePriceKobo: "Prices (including class prices) cannot be edited after the first paid order. Ask a Super Admin or create a new item." });
  }
  const { status, ...rest } = input;
  await db().doc(`items/${itemId}`).update({ ...rest, ...(item.status === "SUSPENDED" ? {} : { status }), updatedAt: Date.now() });
  await audit({ actorUid: user.uid, actorRole: user.role, action: "ITEM_UPDATED", resourceType: "item", resourceId: itemId });
  return ok({});
});
