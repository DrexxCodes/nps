"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { PROVIDER_LABELS, type ProviderId } from "@/constants/payment-providers";
import type { ProviderOverview } from "@/types/payment-providers";
import { CredoForm } from "./CredoForm";
import { PaystackForm } from "./PaystackForm";
import { ProviderSwitcher } from "./ProviderSwitcher";

export function PaymentProvidersPanel({ overview, isProd }: { overview: ProviderOverview; isProd: boolean }) {
  const [selected, setSelected] = useState<ProviderId>(overview.active);
  return (
    <section aria-labelledby="providers-title" className="mt-5 space-y-5">
      <Card className="space-y-5 lg:p-6">
        <div>
          <h2 id="providers-title" className="font-display text-lg font-bold">Payment provider</h2>
          <p className="mt-0.5 text-sm text-[var(--muted)]">Pick who processes new student payments. You can switch at any time; payments already in progress finish with their original provider.</p>
        </div>
        {!overview.encryptionReady && <p role="alert" className="rounded-xl bg-amber-500/15 px-4 py-3 text-sm text-[var(--warn)]">Set <code>PROVIDER_SECRETS_KEY</code> (32+ random characters) in the server environment to save keys here. They are encrypted with it before storage.</p>}
        <ProviderSwitcher overview={overview} selected={selected} onSelect={setSelected} />
      </Card>
      <Card className="space-y-4 lg:p-6">
        <h3 className="font-display text-base font-bold">{PROVIDER_LABELS[selected]} keys and webhook</h3>
        {selected === "credo" ? <CredoForm key="credo" overview={overview} isProd={isProd} /> : <PaystackForm key="paystack" overview={overview} />}
      </Card>
    </section>
  );
}
