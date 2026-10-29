"use client";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Select } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { CREDO_ENVIRONMENTS, CREDO_ENVIRONMENT_LABELS } from "@/constants/payment-providers";
import { useProviderActions } from "@/hooks/useProviderActions";
import type { CredoEnvironment, ProviderOverview } from "@/types/payment-providers";
import { CopyField } from "./CopyField";

interface V { environment: CredoEnvironment; publicKey: string; secretKey: string; businessCode: string; webhookSignature: string; clearWebhookSignature: boolean }

export function CredoForm({ overview, isProd }: { overview: ProviderOverview; isProd: boolean }) {
  const c = overview.credo;
  const { saveKeys } = useProviderActions();
  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm<V>({ defaultValues: { environment: c.environment, publicKey: c.publicKey, secretKey: "", businessCode: c.businessCode, webhookSignature: "", clearWebhookSignature: false } });
  const env = watch("environment");
  const onSubmit = handleSubmit(async (v) => { if (await saveKeys("credo", { ...v })) reset({ ...v, secretKey: "", webhookSignature: "", clearWebhookSignature: false }); });
  return (
    <form suppressHydrationWarning onSubmit={onSubmit} className="space-y-4">
      <Select label="Environment" hint="Sandbox and production have separate keys and dashboards; keys do not work across them." {...register("environment")}>
        {CREDO_ENVIRONMENTS.map((e) => <option key={e} value={e}>{CREDO_ENVIRONMENT_LABELS[e]}</option>)}
      </Select>
      {isProd && env === "sandbox" && <p role="alert" className="rounded-xl bg-amber-500/15 px-4 py-3 text-sm text-[var(--warn)]">This server runs in production but Credo is set to sandbox: students would not be charged real money.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Public key" autoComplete="off" placeholder="0PUB…" hint="Used to start payments." {...register("publicKey")} />
        <PasswordInput label="Secret key" autoComplete="off" placeholder={c.secretKeyMask ? `Saved ${c.secretKeyMask} (leave blank to keep)` : "Your Credo secret key"} hint="Used to verify payments and webhooks. Stored encrypted." {...register("secretKey")} />
        <Input label="Business code" autoComplete="off" placeholder="700607002190001" hint="Shown in your Credo dashboard." {...register("businessCode")} />
        <PasswordInput label="Webhook signing signature (optional)" autoComplete="off" placeholder={c.hasWebhookSignature ? `Saved ${c.webhookSignatureMask} (leave blank to keep)` : "Paste from the Credo dashboard"} hint="NPS already computes it from the secret key and business code." {...register("webhookSignature")} />
      </div>
      {c.hasWebhookSignature && <Checkbox label="Remove the saved signing signature" {...register("clearWebhookSignature")} />}
      <CopyField label="Webhook URL (Credo dashboard > Settings > Webhooks, HTTPS only)" value={overview.webhookUrls.credo} />
      <p className="text-xs text-[var(--muted)]">Credo signs each webhook with SHA-512(secret key + business code) in the <code>X-Credo-Signature</code> header. NPS recomputes that from the keys above, and never acts on the webhook body alone: every payment is re-verified with Credo&apos;s API first.</p>
      <Button type="submit" loading={isSubmitting} disabled={!overview.encryptionReady} className="w-full sm:w-auto">Save Credo keys</Button>
    </form>
  );
}
