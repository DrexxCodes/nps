"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { PROVIDER_LABELS, type ProviderId } from "@/constants/payment-providers";
import { api } from "@/lib/client/api";

/** Save keys / switch provider, with toasts and a server refresh so the panel always shows the stored (masked) state. */
export function useProviderActions() {
  const toast = useToast();
  const router = useRouter();
  const [switching, setSwitching] = useState<ProviderId | null>(null);

  const saveKeys = async (provider: ProviderId, json: Record<string, unknown>): Promise<boolean> => {
    const r = await api(`/api/admin/payment-providers/${provider}`, { method: "PUT", json });
    if (r.ok) { toast("success", `${PROVIDER_LABELS[provider]} keys saved`); router.refresh(); return true; }
    toast("error", Object.values(r.fields ?? {})[0] ?? r.message);
    return false;
  };

  const activate = async (provider: ProviderId): Promise<boolean> => {
    setSwitching(provider);
    const r = await api("/api/admin/payment-providers/active", { method: "POST", json: { provider } });
    setSwitching(null);
    if (r.ok) { toast("success", `New payments now go through ${PROVIDER_LABELS[provider]}`); router.refresh(); return true; }
    toast("error", r.message);
    return false;
  };

  return { saveKeys, activate, switching };
}
