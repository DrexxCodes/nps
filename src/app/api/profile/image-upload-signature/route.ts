import { ok, route } from "@/lib/server/errors";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { signUpload } from "@/lib/server/cloudinary";
import { requireUser } from "@/lib/server/session";

export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`sig:${user.uid}:${clientIp(req)}`, 10, 60_000);
  return ok({ upload: signUpload(user.uid) });
});
