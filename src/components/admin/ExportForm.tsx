"use client";
import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

export function ExportForm({ items, fixedItemId }: { items: { id: string; name: string }[]; fixedItemId?: string }) {
  const toast = useToast();
  const [itemId, setItemId] = useState(fixedItemId ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fulfillment, setFulfillment] = useState("ALL");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/exports/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: itemId || undefined, from: from || undefined, to: to || undefined, fulfillment }) });
      if (!res.ok) { const j = await res.json().catch(() => null); return toast("error", j?.fields?._ ?? j?.message ?? "Export failed"); }
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement("a"), { href: url, download: `nps-report-${new Date().toISOString().slice(0, 10)}.pdf` });
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast("error", "Export failed. Check your connection."); } finally { setBusy(false); }
  };

  return (
    <Card className="max-w-xl space-y-4">
      {!fixedItemId && <Select label="Item" value={itemId} onChange={(e) => setItemId(e.target.value)}><option value="">All items I can access</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</Select>}
      <div className="grid gap-4 sm:grid-cols-2"><Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} hint="Same day twice exports a single date." /></div>
      <Select label="Fulfillment" value={fulfillment} onChange={(e) => setFulfillment(e.target.value)}><option value="ALL">All paid orders</option><option value="AWAITING">Awaiting collection</option><option value="DELIVERED">Delivered</option></Select>
      <Button loading={busy} icon={<Download className="size-4" />} onClick={run}>Export PDF</Button>
      <p className="text-xs text-[var(--muted)]">Only paid orders are included. Contact details, bank data and emergency contacts are never exported.</p>
    </Card>
  );
}
