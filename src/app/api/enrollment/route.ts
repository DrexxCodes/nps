import { enrollmentSchema } from "@/lib/validation/schemas";
import { enrollStudent } from "@/lib/server/enrollment";
import { ok, route } from "@/lib/server/errors";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

export const POST = route(async (req: Request) => {
  rateLimit(`enroll:${clientIp(req)}`, 8, 10 * 60_000);
  const input = enrollmentSchema.parse(await req.json());
  await enrollStudent(input);
  return ok({}, 201);
});
