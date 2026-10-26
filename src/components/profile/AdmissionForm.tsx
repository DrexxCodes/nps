"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ERROR_MESSAGES } from "@/constants";
import { api } from "@/lib/client/api";

export function AdmissionForm({ onDone }: { onDone: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setError(undefined);
    const r = await api("/api/profile/admission-number", { method: "POST", json: { admissionNumber: value } });
    setBusy(false);
    if (r.ok) return onDone();
    setError(ERROR_MESSAGES[r.fields?.admissionNumber ?? ""] ?? r.fields?.admissionNumber ?? r.message);
  };
  return (
    <div className="space-y-3">
      <Input label="Admission number" inputMode="numeric" maxLength={10} value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} error={error} hint="10 digits. You can only set this once." />
      <Button className="w-full" loading={busy} disabled={value.length !== 10} onClick={submit}>Save admission number</Button>
    </div>
  );
}
