import "server-only";
import { derivedAcademicYear, getUserDoc } from "./profile";
import { getPlatformSettings } from "./settings";

/**
 * A user's class (academic year) for class pricing, derived from their admission number. Null for signed-out visitors
 * and for students who haven't added an admission number yet; both pay the item's initial price.
 */
export async function currentClassYear(uid: string | null | undefined): Promise<number | null> {
  if (!uid) return null;
  const [profile, settings] = await Promise.all([getUserDoc(uid), getPlatformSettings()]);
  return derivedAcademicYear(profile?.admissionNumber ?? null, settings);
}
