"use client";
import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/** Downloads the item's full money record as a PDF (all requests and every settlement day, not just the 15 on screen). */
export function ExportWithdrawalsButton({ itemId }: { itemId: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/exports/withdrawals?itemId=${encodeURIComponent(itemId)}`, { credentials: "same-origin" });
      if (!res.ok) { const j = await res.json().catch(() => null); return toast("error", j?.fields?.itemId ?? j?.message ?? "Export failed"); }
      const url = URL.createObjectURL(await res.blob());
      Object.assign(document.createElement("a"), { href: url, download: `nps-withdrawals-${new Date().toISOString().slice(0, 10)}.pdf` }).click();
      URL.revokeObjectURL(url);
    } catch { toast("error", "Export failed. Check your connection."); } finally { setBusy(false); }
  };
  return <Button size="sm" variant="outline" loading={busy} icon={<Download className="size-4" />} onClick={run}>Export PDF</Button>;
}
