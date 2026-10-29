"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client/api";
import { formatNaira } from "@/lib/money";
import { formatWhen, maskAccount } from "@/lib/wallet";
import type { WithdrawalRecord } from "@/types/withdrawals";
import { WithdrawalBadge } from "./WithdrawalBadge";

/** A list of requests (account numbers masked). `canCancel` shows Cancel on open requests. `showItem` is for lists that mix items. */
export function WithdrawalHistory({ rows, canCancel = false, showItem = false }: { rows: WithdrawalRecord[]; canCancel?: boolean; showItem?: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const cancel = async (id: string) => {
    setBusyId(id);
    const r = await api(`/api/withdrawals/${id}/cancel`, { method: "POST", json: {} });
    setBusyId(null);
    if (r.ok) { toast("success", "Request cancelled"); router.refresh(); } else toast("error", r.message);
  };

  return (
    <div className="space-y-3">
      {rows.map((w) => (
        <Card key={w.id} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><span className="font-display text-lg font-bold">{formatNaira(w.amountKobo)}</span><WithdrawalBadge status={w.status} /></div>
            <span className="text-sm text-[var(--muted)]">{formatWhen(w.requestedAt)}</span>
          </div>
          {showItem && <p className="text-sm font-medium">{w.itemName}</p>}
          <p className="text-sm text-[var(--muted)]">{w.destination.bankName} · {maskAccount(w.destination.accountNumber)} · {w.destination.accountName}</p>
          {w.status === "PAID" && <p className="text-sm">Paid {w.processedAt ? formatWhen(w.processedAt) : ""}{w.payoutReference ? ` · Ref ${w.payoutReference}` : ""}{w.note ? ` · ${w.note}` : ""}</p>}
          {(w.status === "REJECTED" || w.status === "CANCELLED") && w.reason && <p className="text-sm text-[var(--muted)]">{w.status === "REJECTED" ? "Reason: " : ""}{w.reason}</p>}
          {canCancel && w.status === "PENDING" && <Button size="sm" variant="outline" loading={busyId === w.id} onClick={() => cancel(w.id)}>Cancel request</Button>}
        </Card>
      ))}
    </div>
  );
}
