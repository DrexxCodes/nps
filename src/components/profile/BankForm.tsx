"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { api } from "@/lib/client/api";

export function BankForm({ onDone }: { onDone: () => void }) {
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [bank, setBank] = useState("");
  const [number, setNumber] = useState("");
  const [resolved, setResolved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<{ banks: { name: string; code: string }[] }>("/api/payments/banks").then((r) => r.ok ? setBanks(r.banks) : setError(r.message)); }, []);
  const reset = () => setResolved(null);

  const resolve = async () => {
    setBusy(true); setError(null);
    const r = await api<{ accountName: string }>("/api/payments/resolve-account", { method: "POST", json: { bankCode: bank, accountNumber: number } });
    setBusy(false);
    r.ok ? setResolved(r.accountName) : setError(r.fields?.accountNumber ?? r.message);
  };
  const confirm = async () => {
    setBusy(true);
    const r = await api("/api/profile/bank", { method: "POST", json: { bankCode: bank, accountNumber: number } });
    setBusy(false);
    r.ok ? onDone() : setError(r.message);
  };

  return (
    <div className="space-y-3">
      <Select label="Bank" value={bank} onChange={(e) => { setBank(e.target.value); reset(); }}>
        <option value="">Select your bank</option>
        {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
      </Select>
      <Input label="Account number" inputMode="numeric" maxLength={10} value={number} onChange={(e) => { setNumber(e.target.value.replace(/\D/g, "")); reset(); }} />
      {resolved && <p className="rounded-xl bg-[var(--accent-soft)] p-3 text-sm">Account name: <b>{resolved}</b></p>}
      {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
      {resolved ? <Button className="w-full" loading={busy} onClick={confirm}>Yes, this is my account</Button> : <Button className="w-full" variant="outline" loading={busy} disabled={!bank || number.length !== 10} onClick={resolve}>Look up account</Button>}
    </div>
  );
}
