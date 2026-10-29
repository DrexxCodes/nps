"use client";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useProviderActions } from "@/hooks/useProviderActions";
import type { ProviderOverview } from "@/types/payment-providers";
import { CopyField } from "./CopyField";

interface V { secretKey: string; publicKey: string }

export function PaystackForm({ overview }: { overview: ProviderOverview }) {
  const p = overview.paystack;
  const { saveKeys } = useProviderActions();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<V>({ defaultValues: { secretKey: "", publicKey: p.publicKey } });
  const onSubmit = handleSubmit(async (v) => { if (await saveKeys("paystack", { secretKey: v.secretKey, publicKey: v.publicKey })) reset({ secretKey: "", publicKey: v.publicKey }); });
  return (
    <form suppressHydrationWarning onSubmit={onSubmit} className="space-y-4">
      {p.source === "env" && <p className="rounded-xl bg-[var(--accent-soft)] px-4 py-3 text-sm">Paystack is currently running on <code>PAYSTACK_SECRET_KEY</code> from the server environment. Save the keys here to manage them from this panel instead.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordInput label="Secret key" autoComplete="off" placeholder={p.secretKeyMask ? `Saved ${p.secretKeyMask} (leave blank to keep)` : "sk_live_…"} {...register("secretKey")} />
        <Input label="Public key (optional)" autoComplete="off" placeholder="pk_live_…" {...register("publicKey")} />
      </div>
      <CopyField label="Webhook URL (event: charge.success)" value={overview.webhookUrls.paystack} />
      <p className="text-xs text-[var(--muted)]">Paystack signs each webhook with an HMAC-SHA512 of the request body using your secret key, so no separate signing secret is needed.</p>
      <Button type="submit" loading={isSubmitting} disabled={!overview.encryptionReady} className="w-full sm:w-auto">Save Paystack keys</Button>
    </form>
  );
}
