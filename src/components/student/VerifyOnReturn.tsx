"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";

/** Paystack's redirect is only a hint: ask the server to verify with Paystack, then refresh. */
export function VerifyOnReturn({ reference }: { reference: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("Confirming your payment…");
  useEffect(() => {
    let tries = 0;
    const run = async () => {
      const r = await api<{ status: string }>("/api/payments/verify", { method: "POST", json: { reference } });
      if (!r.ok) return setMsg(r.message);
      if (r.status === "SUCCESSFUL") { setMsg("Payment confirmed."); router.replace("/dashboard/orders"); router.refresh(); return; }
      if (r.status === "PENDING" && tries++ < 6) return void setTimeout(run, 3000);
      setMsg(r.status === "PENDING" ? "Your payment is still processing. This page will update once it is confirmed — you can safely leave." : "This payment did not go through. You have not been charged for an order.");
    };
    void run();
  }, [reference, router]);
  return <p role="status" className="glass mb-5 rounded-2xl p-4 text-sm">{msg}</p>;
}
