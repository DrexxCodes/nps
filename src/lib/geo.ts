import { getLGAsByState, getStateByName, type LGA, type State } from "@some19ice/nigeria-geo-core";

/**
 * State/LGA validation backed by @some19ice/nigeria-geo-core (37 states, 774 LGAs).
 * Server and tests only: client components must NOT import this file, because the dataset is ~200 KB.
 * The UI loads the package lazily instead (see components/profile/StateLgaSelect.tsx).
 */

/** Values stored before the package was adopted. */
const LEGACY_STATE_NAMES: Record<string, string> = { fct: "Federal Capital Territory", abuja: "Federal Capital Territory" };

export function findState(name: string | null | undefined): State | null {
  const n = (name ?? "").trim();
  if (!n) return null;
  return getStateByName(LEGACY_STATE_NAMES[n.toLowerCase()] ?? n) ?? null;
}

export function findLga(stateName: string | null | undefined, lgaName: string | null | undefined): { state: State; lga: LGA } | null {
  const state = findState(stateName);
  const wanted = (lgaName ?? "").trim().toLowerCase();
  if (!state || !wanted) return null;
  const lga = getLGAsByState(state.id).find((l) => l.name.toLowerCase() === wanted);
  return lga ? { state, lga } : null;
}

/** Canonical (package) spelling of a stored state name, e.g. the old "FCT" becomes "Federal Capital Territory". Empty string when unknown. */
export const canonicalStateName = (name: string | null | undefined): string => findState(name)?.name ?? "";
export const canonicalLgaName = (stateName: string | null | undefined, lgaName: string | null | undefined): string => findLga(stateName, lgaName)?.lga.name ?? "";
