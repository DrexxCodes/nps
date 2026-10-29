"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client/api";

export function SuspendButton({ itemId, suspended }: { itemId: string; suspended: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = reason.trim().length >= 3;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    const r = await api(`/api/admin/items/${itemId}/suspend`, { method: "POST", json: { suspend: !suspended, reason: reason.trim() } });
    setBusy(false);
    if (r.ok) { toast("success", suspended ? "Item restored" : "Item suspended"); setOpen(false); setReason(""); router.refresh(); } else toast("error", r.message);
  };

  return (
    <>
      <Button variant={suspended ? "outline" : "danger"} size="sm" onClick={() => setOpen(true)}>{suspended ? "Restore item" : "Suspend item"}</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={suspended ? "Restore this item?" : "Suspend this item?"}>
        <p className="mb-4 text-sm text-[var(--muted)]">{suspended ? "It goes back to Active and students can buy it again (unless its closing time has passed)." : "Students can no longer buy it. Paid orders and history are kept."}</p>
        <Textarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} hint="At least 3 characters. Saved in the audit log." />
        <div className="mt-5 flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button><Button variant={suspended ? "primary" : "danger"} className="flex-1" loading={busy} disabled={!valid} onClick={submit}>{suspended ? "Restore" : "Suspend"}</Button></div>
      </Sheet>
    </>
  );
}
