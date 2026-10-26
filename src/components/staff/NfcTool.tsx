"use client";
import { Nfc } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client/api";
import { ERROR_MESSAGES } from "@/constants";

interface NdefWriter { write(m: { records: { recordType: string; data: string }[] }): Promise<void> }
declare global { interface Window { NDEFReader?: new () => NdefWriter } }

export function NfcTool({ items }: { items: { id: string; name: string }[] }) {
  const toast = useToast();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [adm, setAdm] = useState("");
  const [state, setState] = useState<"idle" | "preparing" | "waiting" | "done">("idle");

  useEffect(() => setSupported(typeof window !== "undefined" && "NDEFReader" in window && window.isSecureContext), []);

  const write = async () => {
    setState("preparing");
    const p = await api<{ studentName: string; url: string | null; text: string }>(`/api/staff/nfc-payload?itemId=${itemId}&admissionNumber=${adm}`);
    if (!p.ok) { setState("idle"); return toast("error", p.message); }
    try {
      setState("waiting"); // user gesture already happened (button tap); now hold the card to the phone
      const records = [...(p.url ? [{ recordType: "url", data: p.url }] : []), ...(p.text ? [{ recordType: "text", data: p.text }] : [])];
      await new window.NDEFReader!().write({ records });
      setState("done");
      toast("success", `Card written for ${p.studentName}. Delivery still needs to be confirmed separately.`);
    } catch (e) {
      setState("idle");
      const name = (e as { name?: string }).name;
      toast("error", name === "AbortError" ? "Writing was cancelled." : name === "NotAllowedError" ? "NFC permission was denied." : "Couldn't write to the card. Hold it steady against the back of the phone and try again.");
    }
  };

  if (items.length === 0) return <Card><p className="text-sm">No items assigned to you need NFC encoding.</p></Card>;
  if (supported === false) return <Card className="max-w-xl"><p className="font-semibold">{ERROR_MESSAGES.NFC_NOT_SUPPORTED}</p><p className="mt-1 text-sm text-[var(--muted)]">Web NFC works in Chrome on Android over HTTPS. You can still deliver orders from the Collect page.</p></Card>;
  return (
    <Card className="max-w-xl space-y-4">
      <Select label="Item" value={itemId} onChange={(e) => setItemId(e.target.value)}>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</Select>
      <Input label="Student admission number" inputMode="numeric" maxLength={10} value={adm} onChange={(e) => setAdm(e.target.value.replace(/\D/g, ""))} />
      <Button className="w-full" icon={<Nfc className="size-4" />} loading={state === "preparing"} disabled={adm.length !== 10 || supported === null || state === "waiting"} onClick={write}>{state === "waiting" ? "Hold the card to the phone…" : "Write NFC card"}</Button>
      {state === "done" && <p role="status" className="text-sm text-[var(--accent)]">Done. Writing a card never marks the order delivered.</p>}
    </Card>
  );
}
