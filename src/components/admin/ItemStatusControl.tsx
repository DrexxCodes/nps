"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { ITEM_STATUSES } from "@/constants";
import { api } from "@/lib/client/api";
import { ITEM_STATUS_LABEL } from "@/lib/item-status";
import type { ItemStatus } from "@/types";

/** Change an item's status without opening the full form. Suspended items are restored with the Restore button instead. */
export function ItemStatusControl({ itemId, status }: { itemId: string; status: ItemStatus }) {
  const toast = useToast();
  const router = useRouter();
  const [value, setValue] = useState<ItemStatus>(status);
  const [busy, setBusy] = useState(false);
  const suspended = status === "SUSPENDED";

  const save = async () => {
    setBusy(true);
    const r = await api(`/api/admin/items/${itemId}/status`, { method: "POST", json: { status: value } });
    setBusy(false);
    if (r.ok) { toast("success", `Status set to ${ITEM_STATUS_LABEL[value].toLowerCase()}`); router.refresh(); } else toast("error", Object.values(r.fields ?? {})[0] ?? r.message);
  };

  return (
    <div className="flex items-end gap-3">
      <div className="min-w-44 flex-1">
        <Select label="Change status" value={value} disabled={suspended} onChange={(e) => setValue(e.target.value as ItemStatus)} hint={suspended ? "Suspended: use Restore item." : undefined}>
          {ITEM_STATUSES.filter((s) => s !== "SUSPENDED").map((s) => <option key={s} value={s}>{ITEM_STATUS_LABEL[s]}</option>)}
        </Select>
      </div>
      <Button size="sm" loading={busy} disabled={suspended || value === status} onClick={save}>Update</Button>
    </div>
  );
}
