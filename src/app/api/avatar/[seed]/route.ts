import { createAvatar } from "@dicebear/core";
import * as lorelei from "@dicebear/lorelei";
import { AVATAR_SEED_PATTERN } from "@/lib/avatar";

export const runtime = "nodejs";

/** Public on purpose: the seed is a hash or a name, never an email, and public profile pages need it signed out. Immutable, so cached hard. */
export async function GET(_req: Request, ctx: { params: Promise<{ seed: string }> }) {
  const seed = decodeURIComponent((await ctx.params).seed);
  if (!AVATAR_SEED_PATTERN.test(seed)) return new Response("Bad seed", { status: 400 });
  const svg = createAvatar(lorelei, { seed, backgroundColor: ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"], backgroundType: ["solid"] }).toString();
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" } });
}
