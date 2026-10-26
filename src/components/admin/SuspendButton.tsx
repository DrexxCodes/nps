"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client/api";

export function SuspendButton({ itemId, suspended }: { itemId: string; suspended: boolean }) {
  const toast = useToast();
  const router = useRouter();
  return (
    <Button variant={suspended ? "outline" : "danger"} size="sm" onClick={async () => {
      const reason = window.prompt(suspended ? "Reason for restoring this item?" : "Reason for suspending this item? Paid orders and history are kept.");
      if (!reason || reason.trim().length < 3) return;
      const r = await api(`/api/admin/items/${itemId}/suspend`, { method: "POST", json: { suspend: !suspended, reason } });
      if (r.ok) { toast("success", suspended ? "Item restored (paused)" : "Item suspended"); router.refresh(); } else toast("error", r.message);
    }}>{suspended ? "Restore item" : "Suspend item"}</Button>
  );
}
