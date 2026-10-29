"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client/api";
import { formatNaira } from "@/lib/money";
import { formatWhen } from "@/lib/wallet";
import type { WithdrawalRecord } from "@/types/withdrawals";
import { CopyField } from "../payments/CopyField";

type Panel = { id: string; mode: "PAY" | "REJECT" } | null;

/** Platform admin: open requests, oldest first, with the full account to pay. Marking one paid deducts it from the item's wallet. */
export function WithdrawalQueue({ rows }: { rows: WithdrawalRecord[] }) {
  const toast = useToast();
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const open = (id: string, mode: "PAY" | "REJECT") => { setPanel({ id, mode }); setText(""); setNote(""); };
  const run = async () => {
    if (!panel) return;
    setBusy(true);
    const r = panel.mode === "PAY"
      ? await api(`/api/admin/withdrawals/${panel.id}/pay`, { method: "POST", json: { reference: text || undefined, note: note || undefined } })
      : await api(`/api/admin/withdrawals/${panel.id}/reject`, { method: "POST", json: { reason: text } });
    setBusy(false);
    if (!r.ok) return toast("error", Object.values(r.fields ?? {})[0] ?? r.message);
    toast("success", panel.mode === "PAY" ? "Marked as paid and deducted" : "Request rejected");
    setPanel(null);
    router.refresh();
  };

  return (
    <div className="space-y-3">
      {rows.map((w) => (
        <Card key={w.id} className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><p className="font-display text-xl font-bold">{formatNaira(w.amountKobo)}</p><p className="text-sm">{w.itemName}</p><p className="text-sm text-[var(--muted)]">Requested by {w.requesterName || "Unknown"} · {formatWhen(w.requestedAt)}</p></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="text-sm"><span className="block text-[var(--muted)]">Bank</span><b>{w.destination.bankName}</b></div>
            <div className="text-sm"><span className="block text-[var(--muted)]">Account name</span><b>{w.destination.accountName}</b></div>
            <CopyField label="Account number" value={w.destination.accountNumber} />
          </div>
          {panel?.id === w.id ? (
            <div className="space-y-3 rounded-xl bg-[var(--accent-soft)] p-3">
              {panel.mode === "PAY" ? (
                <>
                  <p className="text-sm">Confirm only after the transfer has gone out. {formatNaira(w.amountKobo)} will be deducted from the item&apos;s balance.</p>
                  <div className="grid gap-3 sm:grid-cols-2"><Input label="Transfer reference (optional)" value={text} maxLength={80} onChange={(e) => setText(e.target.value)} /><Input label="Note (optional)" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} /></div>
                </>
              ) : <Input label="Reason (shown to the admin)" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} />}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={panel.mode === "PAY" ? "primary" : "danger"} loading={busy} disabled={panel.mode === "REJECT" && text.trim().length < 3} onClick={run}>{panel.mode === "PAY" ? "Confirm paid" : "Reject request"}</Button>
                <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>Back</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => open(w.id, "PAY")}>Mark as paid</Button><Button size="sm" variant="outline" onClick={() => open(w.id, "REJECT")}>Reject</Button></div>
          )}
        </Card>
      ))}
    </div>
  );
}
