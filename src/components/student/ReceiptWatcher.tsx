"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/Button";
import { api } from "@/lib/client/api";

const FALLBACK_AFTER_MS = 5000; // our own record first; then ask Paystack directly
const RETRY_VERIFY_MS = 6000;
const GIVE_UP_MS = 90_000;

type Phase = "checking" | "verifying" | "failed" | "abandoned" | "slow";

/**
 * Paystack sends the student back here with the reference. We read our own `References` record every second or so (the webhook
 * usually has already confirmed it). If it is still pending after 5 seconds, we call the verify endpoint, which asks Paystack's
 * transaction API directly and updates the record. When it turns SUCCESSFUL the server re-renders this page as the receipt.
 */
export function ReceiptWatcher({ reference }: { reference: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let verifying = false;
    let lastVerify = 0;
    const started = Date.now();
    setPhase("checking");

    const settle = (status: string): boolean => {
      if (status === "SUCCESSFUL") { router.refresh(); return true; }
      if (status === "FAILED") { setPhase("failed"); return true; }
      if (status === "ABANDONED" || status === "REVERSED") { setPhase("abandoned"); return true; }
      return false;
    };

    const tick = async () => {
      if (!alive) return;
      const elapsed = Date.now() - started;
      const s = await api<{ status: string }>(`/api/payments/status?reference=${encodeURIComponent(reference)}`);
      if (!alive) return;
      if (s.ok && settle(s.status)) return;
      if (elapsed >= FALLBACK_AFTER_MS && !verifying && Date.now() - lastVerify >= RETRY_VERIFY_MS) {
        verifying = true; lastVerify = Date.now(); setPhase("verifying");
        const v = await api<{ status: string }>("/api/payments/verify", { method: "POST", json: { reference } });
        verifying = false;
        if (!alive) return;
        if (v.ok && settle(v.status)) return;
      }
      if (elapsed > GIVE_UP_MS) return setPhase("slow");
      timer = setTimeout(tick, 1500);
    };
    timer = setTimeout(tick, 600);
    return () => { alive = false; clearTimeout(timer); };
  }, [reference, router, attempt]);

  if (phase === "failed" || phase === "abandoned") return (
    <div role="alert" className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
      <AlertTriangle className="mx-auto mb-3 size-10 text-[var(--danger)]" />
      <h2 className="font-display text-xl font-bold">{phase === "failed" ? "Payment didn't go through" : "Payment was not completed"}</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">{phase === "failed" ? "The payment failed, so no order was created." : "The payment window closed before it finished, so no order was created."} Nothing was taken for an order. You can try again any time.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3"><Link href="/items" className={buttonClass()}>Back to items</Link><Link href="/dashboard/transactions" className={buttonClass("outline")}>Payment history</Link></div>
    </div>
  );

  if (phase === "slow") return (
    <div role="status" className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
      <h2 className="font-display text-xl font-bold">Still waiting on confirmation</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">Your bank hasn't confirmed this payment yet. If you were charged, the order will appear in My orders on its own once it is confirmed. You can safely leave this page.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3"><Button onClick={() => setAttempt((n) => n + 1)}>Check again</Button><Link href="/dashboard/orders" className={buttonClass("outline")}>My orders</Link></div>
    </div>
  );

  return (
    <div role="status" aria-live="polite" className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
      <Loader2 className="mx-auto mb-3 size-10 animate-spin text-[var(--accent)]" aria-hidden />
      <h2 className="font-display text-xl font-bold">Confirming your payment…</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">{phase === "verifying" ? "Taking a little longer than usual, so we're checking with Paystack directly." : "This usually takes a few seconds. Please keep this page open."}</p>
    </div>
  );
}
