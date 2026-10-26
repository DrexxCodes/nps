"use client";
import { Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client/api";

type Found = { uid: string; fullName: string; email: string; role: string; darsAdmin: boolean };

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
  const editable = !!user && user.role !== "SUPER_ADMIN" && !user.darsAdmin;
  return (
    // Phones: stacked. Large screens: search on the left, the person you found on the right, using the full width.
    <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
      <Card className="lg:sticky lg:top-24 lg:p-6">
        <form onSubmit={search} className="space-y-4">
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
          </Card>
        )}
      </div>
    </div>
  );
}
