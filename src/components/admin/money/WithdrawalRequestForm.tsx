"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BankPicker } from "@/components/ui/BankPicker";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { MIN_WITHDRAWAL_KOBO } from "@/constants/withdrawals";
import { api } from "@/lib/client/api";
import { formatNaira, nairaToKobo } from "@/lib/money";

interface Bank { name: string; code: string }

/** Bank + account number -> the bank names the account -> confirm -> request. The name shown is the bank's, and the server looks it up again before saving. */
export function WithdrawalRequestForm({ itemId, availableKobo }: { itemId: string; availableKobo: number }) {
  const toast = useToast();
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bank, setBank] = useState("");
  const [number, setNumber] = useState("");
  const [naira, setNaira] = useState("");
  const [resolved, setResolved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<{ banks: Bank[] }>("/api/payments/banks").then((r) => (r.ok ? setBanks(r.banks) : setError(r.message))); }, []);

  const amountKobo = nairaToKobo(Number(naira) || 0);
  const amountError = naira === "" ? null : amountKobo < MIN_WITHDRAWAL_KOBO ? `The minimum is ${formatNaira(MIN_WITHDRAWAL_KOBO)}` : amountKobo > availableKobo ? "More than the available balance" : null;
  const ready = !!bank && number.length === 10 && amountKobo >= MIN_WITHDRAWAL_KOBO && !amountError;
  const reset = () => { setResolved(null); setError(null); };

  const lookup = async () => {
    setBusy(true); setError(null);
    const r = await api<{ accountName: string }>("/api/payments/resolve-account", { method: "POST", json: { bankCode: bank, accountNumber: number } });
    setBusy(false);
    if (r.ok) setResolved(r.accountName); else setError(r.fields?.accountNumber ?? r.message);
  };

  const submit = async () => {
    setBusy(true); setError(null);
    const r = await api("/api/withdrawals", { method: "POST", json: { itemId, bankCode: bank, accountNumber: number, amountKobo } });
    setBusy(false);
    if (!r.ok) { setError(r.fields?.amountKobo ?? r.fields?.accountNumber ?? r.message); return; }
    toast("success", "Request sent to the platform admin");
    setBank(""); setNumber(""); setNaira(""); setResolved(null);
    router.refresh();
  };

  if (availableKobo < MIN_WITHDRAWAL_KOBO) {
    return <Card className="max-w-xl text-sm"><p className="font-semibold">Nothing to withdraw yet</p><p className="mt-1 text-[var(--muted)]">You can request a withdrawal once at least {formatNaira(MIN_WITHDRAWAL_KOBO)} has been released.</p></Card>;
  }

  return (
    <Card className="max-w-xl space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold">Request a withdrawal</h2>
        <p className="mt-0.5 text-sm text-[var(--muted)]">The platform admin reviews the request and pays it manually. Up to {formatNaira(availableKobo)} is available.</p>
      </div>
      <BankPicker banks={banks} value={bank} onChange={(c) => { setBank(c); reset(); }} />
      <Input label="Account number" inputMode="numeric" maxLength={10} value={number} onChange={(e) => { setNumber(e.target.value.replace(/\D/g, "")); reset(); }} />
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1"><Input label="Amount (₦)" type="number" inputMode="decimal" min={0} step="0.01" value={naira} onChange={(e) => { setNaira(e.target.value); setError(null); }} error={amountError ?? undefined} /></div>
        <Button type="button" variant="outline" className="mb-px" onClick={() => setNaira(String(availableKobo / 100))}>All</Button>
      </div>
      {resolved && <p className="rounded-xl bg-[var(--accent-soft)] p-3 text-sm">Account name: <b>{resolved}</b></p>}
      {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
      {resolved
        ? <Button className="w-full" loading={busy} onClick={submit}>Yes, request {formatNaira(amountKobo)} to this account</Button>
        : <Button className="w-full" variant="outline" loading={busy} disabled={!ready} onClick={lookup}>Look up account</Button>}
    </Card>
  );
}
