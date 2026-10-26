import "server-only";
import { DEFAULT_PLATFORM_SETTINGS } from "@/constants";
import type { PlatformSettings } from "@/types";
import { db } from "./firebase-admin";

/**
 * Returns ONLY the known settings fields, as plain values. The raw document also holds `updatedAt` (a Firestore
 * Timestamp class instance) and `updatedBy`; spreading those through made Next.js refuse to pass the object from the
 * server page to the client form ("Only plain objects ... can be passed to Client Components").
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  const data = (await db().doc("settings/platform").get()).data() ?? {};
  const out: Record<string, unknown> = { ...DEFAULT_PLATFORM_SETTINGS };
  for (const key of Object.keys(DEFAULT_PLATFORM_SETTINGS)) if (data[key] !== undefined) out[key] = data[key];
  return out as unknown as PlatformSettings;
}
