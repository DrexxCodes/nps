"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client/api";

export function StaffManager({ itemId, staff }: { itemId: string; staff: { uid: string; fullName: string; email: string }[] }) {
  const toast = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const act = async (u: string, action: "ASSIGN" | "REMOVE") => {
    const r = await api(`/api/admin/items/${itemId}/staff`, { method: "POST", json: { email: u, action } });
    if (r.ok) { toast("success", action === "ASSIGN" ? "Staff assigned" : "Staff removed"); setEmail(""); router.refresh(); } else toast("error", Object.values(r.fields ?? {})[0] ?? r.message);
  };
  return (
    <div className="max-w-xl space-y-4">
      <Card className="flex items-end gap-3"><div className="flex-1"><Input label="Staff email" type="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} hint="They must already be promoted to Staff." /></div><Button disabled={!email.includes("@")} onClick={() => act(email, "ASSIGN")}>Assign</Button></Card>
      {staff.length === 0 ? <p className="text-sm text-[var(--muted)]">No staff assigned yet.</p> : staff.map((s) => <Card key={s.uid} className="flex items-center justify-between py-3"><span><b>{s.fullName}</b> <span className="text-sm text-[var(--muted)]">{s.email}</span></span><Button variant="ghost" size="sm" onClick={() => act(s.email, "REMOVE")}>Remove</Button></Card>)}
    </div>
  );
}
