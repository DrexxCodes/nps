"use client";
import { Search } from "lucide-react";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { FulfillmentBadge, PaymentBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client/api";

interface Result { orderId: string; reference: string; itemName: string; options: string; studentName: string; admissionNumber: string | null; academicYear: number | null; avatarUrl: string; paymentStatus: string; batchNumber: number | null; batchStatus: string | null; fulfillmentStatus: string; batchingEnabled: boolean; ready: boolean; notReadyReason: string | null }

export function CollectClient() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Result | null>(null);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    const r = await api<{ results: Result[] }>(`/api/staff/orders/search?q=${encodeURIComponent(q.trim())}`);
    setBusy(false);
    r.ok ? setResults(r.results) : toast("error", r.fields?.q ?? r.message);
  };
  const deliver = async () => {
    if (!confirm) return;
    const r = await api(`/api/staff/orders/${confirm.orderId}/deliver`, { method: "POST", json: { confirm: true } });
    if (r.ok) {
      // Update just this card instead of searching again: saves re-reading the student's whole order list.
      toast("success", `Delivered to ${confirm.studentName}`);
      setResults((rs) => rs && rs.map((x) => (x.orderId === confirm.orderId ? { ...x, fulfillmentStatus: "DELIVERED", ready: false, notReadyReason: null } : x)));
      setConfirm(null);
    } else { toast("error", r.message); setConfirm(null); void search(); } // something changed under us (e.g. already delivered): show the true state
  };

  return (
    <div className="max-w-xl space-y-4">
      <form suppressHydrationWarning onSubmit={search} className="space-y-1.5">
        {/* The hint sits BELOW the row (not inside the input's wrapper), so the button lines up with the input box itself. */}
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1"><Input label="Reg number, email or order reference" value={q} onChange={(e) => setQ(e.target.value)} autoCapitalize="none" autoComplete="off" /></div>
          <Button type="submit" loading={busy} disabled={q.trim().length < 3} aria-label="Search" icon={<Search className="size-4" />} className="shrink-0">Find</Button>
        </div>
        <p className="text-xs text-[var(--muted)]">Any one of them finds the student&apos;s orders.</p>
      </form>
      {results && results.length === 0 && <EmptyState title="No matching orders" body="Check the number, or the order may belong to an item you aren't assigned to." />}
      {results?.map((r) => (
        <Card key={r.orderId} className="space-y-3">
          <div className="flex items-center gap-3"><Avatar name={r.studentName} src={r.avatarUrl} size={56} /><div><p className="font-display text-lg font-bold">{r.studentName}</p><p className="text-sm text-[var(--muted)]">{r.admissionNumber ?? "No admission number"}{r.academicYear && r.academicYear > 0 ? ` · Year ${r.academicYear}` : ""}</p></div></div>
          <p className="text-sm"><b>{r.itemName}</b>{r.batchNumber ? ` · Batch ${r.batchNumber}` : ""}</p>
          {r.options && <p className="rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm font-medium">{r.options}</p>}
          <div className="flex flex-wrap gap-2"><PaymentBadge status={r.paymentStatus} /><FulfillmentBadge fulfillment={r.fulfillmentStatus} batchStatus={r.batchStatus} batched={r.batchingEnabled} /></div>
          {r.notReadyReason && <div role="alert" className="flex gap-2 rounded-xl bg-amber-500/15 p-3 text-sm text-[var(--warn)]"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /><p>{r.notReadyReason}</p></div>}
          {r.fulfillmentStatus !== "DELIVERED" && <Button className="w-full" disabled={!r.ready} onClick={() => setConfirm(r)}>{r.ready ? "Mark as delivered" : "Not ready for pickup"}</Button>}
        </Card>
      ))}
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Confirm handover">
        {confirm && <><p className="mb-1 text-sm">Hand <b>{confirm.itemName}</b> to <b>{confirm.studentName}</b>?</p><p className="mb-5 text-xs text-[var(--muted)]">This is recorded against your account and can't be undone.</p><div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setConfirm(null)}>Cancel</Button><Button className="flex-1" onClick={deliver}>Yes, delivered</Button></div></>}
      </Sheet>
    </div>
  );
}
