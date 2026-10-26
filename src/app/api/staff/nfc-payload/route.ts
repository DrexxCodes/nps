import { AppError, ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { canOperateItem, loadItem } from "@/lib/server/items";
import { derivedAcademicYear, getUserDoc } from "@/lib/server/profile";
import { OPS_ROLES, requireUser } from "@/lib/server/session";
import { getPlatformSettings } from "@/lib/server/settings";
import { env } from "@/lib/server/env";

/** Builds the NFC payload from verified student data, limited to the fields the item's admin enabled. */
export const GET = route(async (req: Request) => {
  const user = await requireUser(req, OPS_ROLES);
  const p = new URL(req.url).searchParams;
  const itemId = p.get("itemId") ?? "";
  const admissionNumber = p.get("admissionNumber") ?? "";
  const item = await loadItem(itemId);
  if (!canOperateItem(user, item)) throw new AppError("FORBIDDEN");
  if (!item.nfcEnabled) throw new AppError("NOT_FOUND");
  const uid = (await db().doc(`admissionNumbers/${admissionNumber}`).get()).data()?.uid as string | undefined;
  const u = uid ? await getUserDoc(uid) : null;
  if (!u) throw new AppError("NOT_FOUND");
  const settings = await getPlatformSettings();
  const f = item.nfcPayloadFields;
  const lines: string[] = [];
  if (f.includes("ADMISSION_NUMBER")) lines.push(`Admission: ${admissionNumber}`);
  if (f.includes("EMAIL")) lines.push(`Email: ${u.email}`);
  if (f.includes("PHONE") && u.phone) lines.push(`Phone: ${u.phone}`);
  if (f.includes("ACADEMIC_YEAR")) lines.push(`Year: ${derivedAcademicYear(admissionNumber, settings) ?? "-"}`);
  return ok({ studentName: u.fullName, url: f.includes("PROFILE_URL") ? `${env().NEXT_PUBLIC_APP_URL}/st/${admissionNumber}` : null, text: lines.join("\n") });
});
