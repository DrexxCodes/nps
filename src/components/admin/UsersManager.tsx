"use client";
import { Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client/api";

type Found = { uid: string; fullName: string; email: string; role: string; darsAdmin: boolean };
type Preview = { fullName: string; email: string; counts: { orders: number; transactions: number }; blockers: string[] };

export function UsersManager({ isSuper }: { isSuper: boolean }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [user, setUser] = useState<Found | null | undefined>(undefined);
  const [role, setRole] = useState(isSuper ? "ADMIN" : "STAFF");
  const [reason, setReason] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSearching(true);
    const r = await api<{ user: Found | null }>(`/api/admin/users?email=${encodeURIComponent(q.trim())}`);
    setSearching(false);
    r.ok ? setUser(r.user) : toast("error", r.message);
  };
  const apply = async () => {
    setSaving(true);
    const r = await api("/api/admin/users", { method: "POST", json: { email: user!.email, role, reason } });
    setSaving(false);
    if (r.ok) { toast("success", "Role updated"); setReason(""); void search(); } else toast("error", Object.values(r.fields ?? {})[0] ?? r.message);
  };
  // Permanent deletion (Super Admin only): look at what will go, type the email to confirm, give a reason.
  const [delOpen, setDelOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null | undefined>(undefined);
  const [confirmText, setConfirmText] = useState("");
  const [delReason, setDelReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const openDelete = async () => {
    setDelOpen(true); setPreview(undefined); setConfirmText(""); setDelReason("");
    const r = await api<{ preview: Preview | null }>(`/api/admin/users/delete?email=${encodeURIComponent(user!.email)}`);
    if (r.ok) setPreview(r.preview); else { toast("error", r.message); setDelOpen(false); }
  };
  const confirmDelete = async () => {
    setDeleting(true);
    const r = await api("/api/admin/users/delete", { method: "DELETE", json: { email: user!.email, confirmEmail: confirmText, reason: delReason } });
    setDeleting(false);
    if (r.ok) { toast("success", "User deleted"); setDelOpen(false); setUser(undefined); setQ(""); } else toast("error", Object.values(r.fields ?? {})[0] ?? r.message);
  };
  const canDelete = !!preview && preview.blockers.length === 0 && confirmText.trim().toLowerCase() === user?.email.toLowerCase() && delReason.trim().length >= 3;
  const editable = !!user && user.role !== "SUPER_ADMIN" && !user.darsAdmin;
  return (
    // Phones: stacked. Large screens: search on the left, the person you found on the right, using the full width.
    <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
      <Card className="lg:sticky lg:top-24 lg:p-6">
        <form suppressHydrationWarning onSubmit={search} className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold">Find a user</h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">Search by the email on their account.</p>
          </div>
          <Input label="Email" type="email" autoCapitalize="none" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button type="submit" loading={searching} disabled={!q.includes("@")} className="w-full" icon={<Search className="size-4" />}>Search</Button>
        </form>
      </Card>

      <div>
        {user === undefined && <EmptyState icon={<Search className="size-6" />} title="Find someone to manage" body="Search by email to see their current role and change it." />}
        {user === null && <EmptyState title="No user with that email" body="Check the spelling. They need an account on NPS or DARS first." />}
        {user && (
          <Card className="space-y-6 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0"><p className="truncate font-display text-xl font-bold">{user.fullName}</p><p className="truncate text-sm text-[var(--muted)]">{user.email}</p></div>
              <Badge tone="green">{user.role.replace("_", " ").toLowerCase()}</Badge>
            </div>
            {user.darsAdmin && <p className="text-sm text-[var(--muted)]">This user is an admin in DARS, so they are an Admin here automatically. Change their access in DARS.</p>}
            {user.role === "SUPER_ADMIN" && <p className="text-sm text-[var(--muted)]">Super Admin roles can&apos;t be changed here.</p>}
            {editable && (
              <div className="space-y-4 border-t border-[var(--line)] pt-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Select label="Change role to" value={role} onChange={(e) => setRole(e.target.value)}>{isSuper && <option value="ADMIN">Admin</option>}<option value="STAFF">Staff</option>{isSuper && <option value="STUDENT">Student</option>}</Select>
                  <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} hint="Recorded in the audit log." />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {!isSuper ? <p className="text-xs text-[var(--muted)]">Admins can promote students to Staff. Only Super Admins can create Admins.</p> : <span />}
                  <Button loading={saving} disabled={reason.trim().length < 3} onClick={apply} className="w-full sm:w-auto">Update role</Button>
                </div>
              </div>
            )}
            {isSuper && user.role !== "SUPER_ADMIN" && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--danger)]/30 bg-red-500/5 p-4">
                <div className="min-w-0"><p className="font-semibold text-[var(--danger)]">Delete this user</p><p className="text-sm text-[var(--muted)]">Permanently removes their sign-in and every record we hold for them.</p></div>
                <Button variant="danger" size="sm" icon={<Trash2 className="size-4" />} onClick={openDelete}>Delete user…</Button>
              </div>
            )}
          </Card>
        )}
      </div>

      <Sheet open={delOpen} onClose={() => !deleting && setDelOpen(false)} title="Delete this user permanently?">
        {preview === undefined && <p className="text-sm text-[var(--muted)]">Checking what this would remove…</p>}
        {preview === null && <p className="text-sm text-[var(--muted)]">That user no longer exists.</p>}
        {preview && (
          <div className="space-y-4">
            <p className="text-sm"><b>{preview.fullName || preview.email}</b> ({preview.email}) will lose their sign-in, profile, public page, photo, {preview.counts.orders} order(s) and {preview.counts.transactions} payment record(s). <b>This cannot be undone.</b> Overall sales and ledger totals are not changed.</p>
            <p className="text-sm text-[var(--muted)]">Accounts are shared with DARS, so they lose DARS access too.</p>
            {preview.blockers.length > 0 ? (
              <div role="alert" className="space-y-1 rounded-xl bg-red-500/10 p-3 text-sm text-[var(--danger)]"><p className="font-semibold">Can&apos;t delete yet</p>{preview.blockers.map((b) => <p key={b}>{b}</p>)}</div>
            ) : (
              <>
                <Input label={`Type ${preview.email} to confirm`} autoCapitalize="none" autoComplete="off" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
                <Input label="Reason" value={delReason} onChange={(e) => setDelReason(e.target.value)} hint="At least 3 characters. Saved in the audit log." />
              </>
            )}
            <div className="flex gap-3"><Button variant="outline" className="flex-1" disabled={deleting} onClick={() => setDelOpen(false)}>Cancel</Button>{preview.blockers.length === 0 && <Button variant="danger" className="flex-1" loading={deleting} disabled={!canDelete} onClick={confirmDelete}>Delete forever</Button>}</div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
