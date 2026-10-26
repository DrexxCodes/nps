"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client/api";
import type { BatchStatus } from "@/types";

export interface BatchRow { id: string; batchNumber: number; status: BatchStatus; maxOrders: number; paidCount: number; reservedCount: number }
const NEXT: Record<BatchStatus, [BatchStatus, string] | null> = { QUEUED: ["PROCESSING", "Start processing"], PROCESSING: ["READY_FOR_PICKUP", "Mark ready for pickup"], READY_FOR_PICKUP: null };
const TONE = { QUEUED: "gray", PROCESSING: "amber", READY_FOR_PICKUP: "blue" } as const;

export function BatchManager({ itemId, batches, sizeLocked }: { itemId: string; batches: BatchRow[]; sizeLocked: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [size, setSize] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, p: Promise<{ ok: boolean; message?: string; fields?: Record<string, string> }>) => {
    setBusy(key);
    const r = await p;
    setBusy(null);
    if (r.ok) { toast("success", "Batch updated"); router.refresh(); } else toast("error", Object.values(r.fields ?? {})[0] ?? r.message ?? "Failed");
  };
  return (
    <div className="space-y-3">
      {batches.map((b) => {
        const next = NEXT[b.status];
        const full = b.paidCount >= b.maxOrders;
        return (
          <Card key={b.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-lg font-bold">Batch {b.batchNumber}</h3>
              <Badge tone={TONE[b.status]}>{b.status.replaceAll("_", " ").toLowerCase()}</Badge>
            </div>
            <p className="text-sm">{b.paidCount} paid of {b.maxOrders}{b.reservedCount > 0 && <span className="text-[var(--muted)]"> · {b.reservedCount} checkout(s) in progress</span>}</p>
            <div className="h-2 rounded-full bg-[var(--line)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, (b.paidCount / b.maxOrders) * 100)}%` }} /></div>
            <div className="flex flex-wrap items-end gap-3">
              {b.status === "QUEUED" && !sizeLocked && (
                <>
                  <div className="w-28"><Input label="Batch size" type="number" min={1} value={size[b.id] ?? String(b.maxOrders)} onChange={(e) => setSize({ ...size, [b.id]: e.target.value })} /></div>
                  <Button variant="outline" size="sm" loading={busy === `s${b.id}`} onClick={() => run(`s${b.id}`, api(`/api/admin/items/${itemId}/batches/${b.id}/size`, { method: "PATCH", json: { maxOrders: Number(size[b.id] ?? b.maxOrders) } }))}>Resize</Button>
                  {b.paidCount > 0 && b.paidCount < b.maxOrders && b.reservedCount === 0 && <Button variant="ghost" size="sm" onClick={() => run(`c${b.id}`, api(`/api/admin/items/${itemId}/batches/${b.id}/size`, { method: "PATCH", json: { maxOrders: b.paidCount } }))}>Close at {b.paidCount}</Button>}
                </>
              )}
              {next && <Button size="sm" disabled={!full} loading={busy === `t${b.id}`} onClick={() => run(`t${b.id}`, api(`/api/admin/items/${itemId}/batches/${b.id}/status`, { method: "POST", json: { status: next[0] } }))}>{next[1]}</Button>}
            </div>
            {next && !full && <p className="text-xs text-[var(--muted)]">A batch must be full before its status can change.</p>}
            {sizeLocked && b.status === "QUEUED" && <p className="text-xs text-[var(--muted)]">The batch limit has been reached, so sizes can no longer be edited.</p>}
          </Card>
        );
      })}
    </div>
  );
}
