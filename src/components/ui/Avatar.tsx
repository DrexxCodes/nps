/* eslint-disable @next/next/no-img-element */
import { defaultAvatarUrl } from "@/lib/avatar";

/**
 * The person's photo when they have one; otherwise their generated Lorelei avatar (not initials).
 * `seed` should be the same seed the server uses for that person so the avatar never changes between pages; it falls back to the name.
 */
export function Avatar({ name, src, seed, size = 48 }: { name: string; src?: string | null; seed?: string; size?: number }) {
  return <img src={src || defaultAvatarUrl(seed || name || "student")} alt={name} width={size} height={size} className="rounded-full bg-[var(--accent-soft)] object-cover" style={{ width: size, height: size }} />;
}
