import "server-only";
import { createHash } from "node:crypto";
import { normalizeSocialUrl } from "@/lib/social";
import type { SocialPlatform } from "@/types";

/**
 * What the public page needs, stored on `admissionNumbers/{admissionNumber}` next to `uid`.
 * The public profile reads ONLY this document. Never put email, phone, DOB year, allergies, emergency contacts or bank data here.
 */
export interface PublicProfileFields {
  fullName: string;
  profileImageUrl: string | null;
  bio: string;
  /** "MM-DD" and only when the student chose to show it; the birth year is never stored here. */
  birthday: string | null;
  socials: { platform: SocialPlatform; url: string }[];
  /** SHA-256 of the email: seeds the default DiceBear avatar without putting the email in a public image URL. */
  avatarSeed: string;
  hidden: boolean;
  syncedAt: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UserLike = Record<string, any>;

export const avatarSeedOf = (email: unknown): string => createHash("sha256").update(String(email ?? "").trim().toLowerCase()).digest("hex");

/** Projects a user document (or the merged result of an update) onto the public fields. */
export function buildPublicProfileFields(u: UserLike, now = Date.now()): PublicProfileFields {
  const links = (u.socialLinks ?? {}) as Partial<Record<SocialPlatform, string>>;
  const socials = ((u.activeSocialLinks ?? []) as SocialPlatform[]).flatMap((platform) => {
    const url = links[platform] ? normalizeSocialUrl(platform, links[platform]!) : null;
    return url ? [{ platform, url }] : [];
  });
  const dob = typeof u.dateOfBirth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(u.dateOfBirth) ? u.dateOfBirth : null;
  return {
    fullName: String(u.fullName ?? u.name ?? ""),
    profileImageUrl: u.profileImageUrl ?? null,
    bio: typeof u.bio === "string" ? u.bio : "",
    birthday: u.birthdayVisibility && dob ? dob.slice(5) : null,
    socials,
    avatarSeed: avatarSeedOf(u.email),
    hidden: u.accountStatus === "SUSPENDED",
    syncedAt: now,
  };
}

/** Keys of `users/{uid}` that feed the public profile: when an update touches one of these, re-sync the admission number document. */
export const PUBLIC_PROFILE_SOURCE_KEYS = ["fullName", "bio", "birthdayVisibility", "dateOfBirth", "socialLinks", "activeSocialLinks", "profileImageUrl"] as const;
