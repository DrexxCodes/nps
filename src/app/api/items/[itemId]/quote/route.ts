import { ok, route } from "@/lib/server/errors";
import { quote } from "@/lib/server/payments";
import { getUserDoc } from "@/lib/server/profile";
import { requireUser } from "@/lib/server/session";

/** Same function that initialization uses, so the preview can never drift from the charge. Priced for the caller's class. */
export const GET = route(async (req: Request, ctx: { params: Promise<{ itemId: string }> }) => {
  const { itemId } = await ctx.params;
  const sub = new URL(req.url).searchParams.get("sub");
  const user = await requireUser(req).catch(() => null); // signed-out visitors are quoted the initial price
  const admissionNumber = user ? ((await getUserDoc(user.uid))?.admissionNumber ?? null) : null;
  const { pricing } = await quote(itemId, sub ? sub.split(",").filter(Boolean) : [], admissionNumber);
  return ok({ pricing });
});
