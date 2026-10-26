"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RequirementsSheet } from "@/components/items/RequirementsSheet";
import { VariantPicker } from "@/components/items/VariantPicker";
import { Button, buttonClass } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client/api";
import { formatNaira } from "@/lib/money";
import { validateVariantSelection, type VariantSelection } from "@/lib/variants";
import type { Pricing, RequirementType, SubItem, VariantSet } from "@/types";

interface Props { itemId: string; itemName: string; hasSubItems: boolean; subItems: SubItem[]; variantSets: VariantSet[]; signedIn: boolean; studentName: string; batched: boolean }

export function Checkout({ itemId, itemName, hasSubItems, subItems, variantSets, signedIn, studentName, batched }: Props) {
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>(subItems.filter((s) => s.required).map((s) => s.id));
  const [variants, setVariants] = useState<VariantSelection>({});
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState<RequirementType[]>([]);

  useEffect(() => {
    let live = true;
    api<{ pricing: Pricing }>(`/api/items/${itemId}/quote?sub=${selected.join(",")}`).then((r) => live && (r.ok ? setPricing(r.pricing) : setPricing(null)));
    return () => { live = false; };
  }, [itemId, selected]);

  const check = useMemo(() => validateVariantSelection(variantSets, variants), [variantSets, variants]);
  const unanswered = variantSets.filter((s) => s.required && !variants[s.id]?.length).map((s) => s.name);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const pay = async () => {
    setBusy(true);
    const r = await api<{ authorizationUrl: string }>("/api/payments/initialize", { method: "POST", json: { itemId, subItemIds: selected, variants } });
    if (r.ok) { window.location.href = r.authorizationUrl; return; }
    setBusy(false);
    if (r.code === "PROFILE_REQUIREMENTS_MISSING" && r.fields?.missing) return setMissing(r.fields.missing.split(",") as RequirementType[]);
    toast("error", r.fields?.variants ?? r.message);
  };

  return (
    <div className="space-y-5">
      {hasSubItems && (
        <fieldset className="space-y-2">
          <legend className="mb-2 font-display text-lg font-bold">Choose what you need</legend>
          {subItems.map((s) => (
            <div key={s.id} className="glass flex items-center justify-between gap-3 rounded-xl p-3">
              <Checkbox label={<span><b>{s.name}</b>{s.required && <span className="ml-2 text-xs text-[var(--muted)]">Required</span>}{s.description && <span className="block text-xs text-[var(--muted)]">{s.description}</span>}</span>} checked={selected.includes(s.id)} disabled={s.required} onChange={() => toggle(s.id)} />
              <span className="shrink-0 text-sm font-semibold">{formatNaira(s.priceKobo)}</span>
            </div>
          ))}
        </fieldset>
      )}

      {variantSets.length > 0 && (
        <div className="space-y-5">
          {variantSets.map((s) => <VariantPicker key={s.id} set={s} value={variants[s.id] ?? []} onChange={(ids) => setVariants((v) => ({ ...v, [s.id]: ids }))} />)}
        </div>
      )}

      <div className="glass rounded-2xl p-5" aria-live="polite">
        <h3 className="mb-3 font-display text-lg font-bold">Order summary</h3>
        {pricing ? (
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatNaira(pricing.subtotalKobo)}</dd></div>
            {pricing.platformFeeKobo > 0 && <div className="flex justify-between"><dt>Platform fee</dt><dd>{formatNaira(pricing.platformFeeKobo)}</dd></div>}
            {pricing.otherFeesKobo > 0 && <div className="flex justify-between"><dt>Other fees</dt><dd>{formatNaira(pricing.otherFeesKobo)}</dd></div>}
            <div className="flex justify-between border-t border-[var(--line)] pt-2 text-base font-bold"><dt>Total</dt><dd>{formatNaira(pricing.totalKobo)}</dd></div>
          </dl>
        ) : <p className="text-sm text-[var(--muted)]">Select at least one option to see your total.</p>}
        {batched && <p className="mt-3 text-xs text-[var(--muted)]">Orders for this item are collected in batches. You'll see your batch status in your dashboard after paying.</p>}
      </div>

      {signedIn ? (
        <Button className="w-full" loading={busy} disabled={!pricing || !check.ok} onClick={pay}>Pay {pricing ? formatNaira(pricing.totalKobo) : ""} with Paystack</Button>
      ) : (
        <Link href={`/login?next=/items/${itemId}`} className={`${buttonClass()} w-full`}>Sign in to pay</Link>
      )}
      {signedIn && unanswered.length > 0 && <p className="text-center text-xs text-[var(--muted)]">Choose an option for {unanswered.join(", ")} to continue.</p>}
      <RequirementsSheet open={missing.length > 0} missing={missing} name={studentName} onClose={() => setMissing([])} onComplete={() => { setMissing([]); void pay(); }} />
      <span className="sr-only">{itemName}</span>
    </div>
  );
}
