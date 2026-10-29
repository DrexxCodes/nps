"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client/api";

/** Two steps: enter the new owner, then confirm what will happen. `asOwner` is false when a Super Admin is moving someone else's item. */
export function TransferOwnershipForm({ itemId, itemName, ownerName, asOwner }: { itemId: string; itemName: string; ownerName: string; asOwner: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [review, setReview] = useState(false);
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const back = () => { setReview(false); setSure(false); setError(null); };
  const submit = async () => {
    setBusy(true); setError(null);
    const r = await api<{ cancelledRequests: number }>(`/api/admin/items/${itemId}/transfer`, { method: "POST", json: { email, reason: reason || undefined } });
    setBusy(false);
    if (!r.ok) { setError(r.fields?.email ?? r.message); setReview(false); setSure(false); return; }
    toast("success", "Ownership transferred");
    if (asOwner) router.replace("/admin/items"); else router.refresh();
  };

  return (
    <Card className="max-w-xl space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold">Transfer ownership</h2>
        <p className="mt-0.5 text-sm text-[var(--muted)]">Current owner: <b>{ownerName}</b>. {asOwner ? "The new owner takes over this item, its orders, its sales totals and its balance." : "You are moving this item as Super Admin, without the owner's permission. The change is recorded in the audit log."}</p>
      </div>
      {!review ? (
        <>
          <Input label="New owner's email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} hint="Must be an active Admin." error={error ?? undefined} />
          <Input label="Reason (optional)" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
          <Button className="w-full" variant="outline" disabled={!/^\S+@\S+\.\S+$/.test(email)} onClick={() => setReview(true)}>Review transfer</Button>
        </>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl bg-[var(--accent-soft)] p-3 text-sm">
            <p>Move <b>{itemName}</b> to <b>{email.trim().toLowerCase()}</b>?</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--muted)]">
              <li>The item, its balance and its withdrawal history go with it.</li>
              <li>Open withdrawal requests are cancelled and their money returns to the balance, because they were made to the previous owner&apos;s account.</li>
              {asOwner && <li>You will no longer be able to manage this item. Only the new owner or a Super Admin can move it again.</li>}
            </ul>
          </div>
          <Checkbox label="I understand and want to transfer this item" checked={sure} onChange={(e) => setSure(e.target.checked)} />
          {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
          <div className="flex flex-wrap gap-2"><Button loading={busy} disabled={!sure} onClick={submit}>Transfer ownership</Button><Button variant="ghost" onClick={back}>Back</Button></div>
        </div>
      )}
    </Card>
  );
}
