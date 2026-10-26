import { MAX_VARIANT_OPTIONS } from "@/constants";
import type { SelectedVariant, VariantSet } from "@/types";

/** setId -> chosen option ids. */
export type VariantSelection = Record<string, string[]>;
export type VariantCheck = { ok: true; chosen: SelectedVariant[] } | { ok: false; errors: Record<string, string> };

/**
 * Validates a student's picks against the item's variable sets (pure: runs in the browser for instant feedback and on
 * the server as the authority). Returns the picks snapshotted with their names, in the admin's set/value order.
 * Errors are keyed by set id; picks for sets that don't exist are keyed "_".
 */
export function validateVariantSelection(sets: VariantSet[], selection: VariantSelection): VariantCheck {
  const errors: Record<string, string> = {};
  const known = new Set(sets.map((s) => s.id));
  if (Object.entries(selection).some(([id, ids]) => !known.has(id) && ids.length > 0)) errors._ = "That selection is no longer available. Refresh and try again.";

  const chosen: SelectedVariant[] = [];
  for (const set of sets) {
    const picked = new Set(selection[set.id] ?? []);
    const options = set.options.filter((o) => picked.has(o.id));
    if (options.length !== picked.size) errors[set.id] = `Choose a valid option for ${set.name}`;
    else if (set.selection === "SINGLE" && options.length > 1) errors[set.id] = `Choose only one option for ${set.name}`;
    else if (set.required && options.length === 0) errors[set.id] = `Choose an option for ${set.name}`;
    else if (options.length) chosen.push({ setId: set.id, setName: set.name, options });
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, chosen };
}

/** "Size: M · Colour: Red, Blue". Empty string when nothing was chosen (or for orders placed before variable sets existed). */
export function describeVariants(selected: SelectedVariant[] | undefined | null): string {
  return (selected ?? []).map((v) => `${v.setName}: ${v.options.map((o) => o.label).join(", ")}`).join(" · ");
}

/** Splits "S, M, L\nXL" into trimmed, de-duplicated (case-insensitive) values, capped at the per-set maximum. */
export function parseOptionLabels(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;\n]/)) {
    const label = part.trim().slice(0, 60);
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out.slice(0, MAX_VARIANT_OPTIONS);
}
