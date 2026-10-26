"use client";
import { useEffect, useMemo, useState } from "react";
import { Select } from "@/components/ui/Field";

type Geo = typeof import("@some19ice/nigeria-geo-core");

// The dataset (37 states, 774 LGAs with coordinates) is ~200 KB, so it is fetched on demand as its own chunk, once.
let geoPromise: Promise<Geo> | null = null;
const loadGeo = () => (geoPromise ??= import("@some19ice/nigeria-geo-core"));

export interface StateLga { state: string; lga: string }

/** State dropdown; choosing a state loads that state's LGAs into the second dropdown. Values are the official names. */
export function StateLgaSelect({ value, onChange, errors }: { value: StateLga; onChange: (v: StateLga) => void; errors?: { state?: string; lga?: string } }) {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => { let live = true; loadGeo().then((g) => live && setGeo(g), () => live && setFailed(true)); return () => { live = false; }; }, []);

  const states = useMemo(() => (geo ? geo.getStates().map((s) => s.name).sort((a, b) => a.localeCompare(b)) : []), [geo]);
  const lgas = useMemo(() => {
    const st = geo && value.state ? geo.getStateByName(value.state) : undefined;
    return st && geo ? geo.getLGAsByState(st.id).map((l) => l.name).sort((a, b) => a.localeCompare(b)) : [];
  }, [geo, value.state]);

  // A stored LGA that isn't in the chosen state's list (old free-text value) is cleared so the user re-picks it, rather than failing validation on save.
  useEffect(() => {
    if (!geo || !value.lga || lgas.length === 0) return;
    const match = lgas.find((l) => l.toLowerCase() === value.lga.trim().toLowerCase());
    if (match !== value.lga) onChange({ state: value.state, lga: match ?? "" });
  }, [geo, lgas, value.lga, value.state, onChange]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Select label="State of origin" value={value.state} disabled={!geo} error={errors?.state ?? (failed ? "Couldn't load the state list. Check your connection and reload." : undefined)}
        onChange={(e) => onChange({ state: e.target.value, lga: "" })}>
        <option value="">{geo ? "Select state" : failed ? "Unavailable" : "Loading states…"}</option>
        {states.map((s) => <option key={s} value={s}>{s}</option>)}
      </Select>
      <Select label="Local government area" value={value.lga} disabled={!geo || !value.state} error={errors?.lga}
        onChange={(e) => onChange({ state: value.state, lga: e.target.value })}>
        <option value="">{value.state ? "Select LGA" : "Select a state first"}</option>
        {lgas.map((l) => <option key={l} value={l}>{l}</option>)}
      </Select>
    </div>
  );
}
