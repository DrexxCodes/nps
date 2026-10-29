"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PROVIDER_IDS, PROVIDER_LABELS, type ProviderId } from "@/constants/payment-providers";
import { useProviderActions } from "@/hooks/useProviderActions";
import type { ProviderOverview } from "@/types/payment-providers";

/** Choose which provider takes new payments. Two taps (select, confirm) so a stray click cannot reroute real money. */
export function ProviderSwitcher({ overview, selected, onSelect }: { overview: ProviderOverview; selected: ProviderId; onSelect: (id: ProviderId) => void }) {
  const { activate, switching } = useProviderActions();
  const [confirming, setConfirming] = useState<ProviderId | null>(null);
  const state = (id: ProviderId) => ({ active: overview.active === id, configured: overview[id].configured });
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Payment provider" className="grid gap-3 sm:grid-cols-2">
        {PROVIDER_IDS.map((id) => {
          const s = state(id);
          return (
            <button key={id} type="button" role="tab" aria-selected={selected === id} onClick={() => { onSelect(id); setConfirming(null); }}
              className={`glass rounded-2xl p-4 text-left transition ${selected === id ? "ring-2 ring-[var(--accent)]" : "hover:bg-[var(--accent-soft)]"}`}>
              <span className="flex items-center justify-between gap-2">
                <span className="font-display text-base font-bold">{PROVIDER_LABELS[id]}</span>
                {s.active ? <Badge tone="green">Taking payments</Badge> : s.configured ? <Badge tone="blue">Ready</Badge> : <Badge tone="amber">Keys needed</Badge>}
              </span>
            </button>
          );
        })}
      </div>

      {overview.active !== selected && (
        confirming === selected ? (
          <div className="flex flex-col gap-3 rounded-xl bg-[var(--accent-soft)] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span>From now on, new payments go through <b>{PROVIDER_LABELS[selected]}</b>. Payments already started finish with the provider they began with.</span>
            <span className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfirming(null)}>Cancel</Button>
              <Button size="sm" loading={switching === selected} onClick={async () => { if (await activate(selected)) setConfirming(null); }}>Confirm switch</Button>
            </span>
          </div>
        ) : (
          <Button variant="outline" disabled={!state(selected).configured} onClick={() => setConfirming(selected)}>
            {state(selected).configured ? `Use ${PROVIDER_LABELS[selected]} for new payments` : `Save ${PROVIDER_LABELS[selected]} keys to enable switching`}
          </Button>
        )
      )}
    </div>
  );
}
