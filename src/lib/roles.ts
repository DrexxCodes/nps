import type { Role } from "@/types";

export const roleHome = (role: Role): string => (role === "SUPER_ADMIN" || role === "ADMIN" ? "/admin" : role === "STAFF" ? "/staff" : "/dashboard");

const NPS_ROLES: readonly Role[] = ["SUPER_ADMIN", "ADMIN", "STAFF", "STUDENT"];

/**
 * NPS and DARS share one `users/{uid}` document, so the effective NPS role is derived from both apps' fields:
 *  - DARS marks admins with `admin: true` (plus a `scope`). Any DARS admin is an Admin in NPS.
 *  - `SUPER_ADMIN` only ever comes from NPS's own `role` field. A DARS super admin is NOT promoted to NPS
 *    Super Admin (that role controls fees and money), so it can't be granted from the other app.
 *  - Otherwise NPS's stored `role` applies; DARS-created accounts have none and are students.
 * The stored NPS role is never overwritten from `admin`, so demoting someone in DARS takes effect here immediately.
 */
export function resolveRole(u: { role?: unknown; admin?: unknown }): Role {
  if (u.role === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (u.admin === true) return "ADMIN";
  return NPS_ROLES.includes(u.role as Role) ? (u.role as Role) : "STUDENT";
}

/** DARS bans with `banned: true`; NPS suspends with `accountStatus: "SUSPENDED"`. Either blocks sign-in on both apps. */
export const isAccountBlocked = (u: { banned?: unknown; accountStatus?: unknown }): boolean => u.banned === true || u.accountStatus === "SUSPENDED";
