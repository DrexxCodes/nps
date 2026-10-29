import { FieldValue } from "firebase-admin/firestore";
import { settingsSchema } from "@/lib/validation/schemas";
import { audit } from "@/lib/server/audit";
import { ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { requireUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";

/** Platform-wide settings (fees, enrollment, duration) are Super Admin only. */
export const GET = route(async (req: Request) => {
  await requireUser(req, ["SUPER_ADMIN"]);
  return ok({ settings: await getPlatformSettings() });
});

export const PATCH = route(async (req: Request) => {
  const user = await requireUser(req, ["SUPER_ADMIN"]);
  const input = settingsSchema.parse(await req.json());
  const cur = await getPlatformSettings();
  const feesChanged = cur.platformFeeEnabled !== input.platformFeeEnabled || cur.platformFeePercentage !== input.platformFeePercentage || cur.platformFeeFlatKobo !== input.platformFeeFlatKobo;
  const holdChanged = input.withdrawalHoldHours !== undefined && input.withdrawalHoldHours !== cur.withdrawalHoldHours;
  await db().doc("settings/platform").set({ ...input, currency: "NGN", feeConfigVersion: cur.feeConfigVersion + (feesChanged ? 1 : 0), updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid }, { merge: true });
  await audit({ actorUid: user.uid, actorRole: user.role, action: feesChanged ? "FEES_CHANGED" : "SETTINGS_CHANGED", resourceType: "settings", resourceId: "platform", metadata: { enrollmentOpen: input.enrollmentOpen, courseDurationYears: input.courseDurationYears } });
  if (holdChanged) await audit({ actorUid: user.uid, actorRole: user.role, action: "WITHDRAWAL_HOLD_CHANGED", resourceType: "settings", resourceId: "platform", metadata: { from: cur.withdrawalHoldHours, to: input.withdrawalHoldHours ?? null } });
  return ok({});
});
