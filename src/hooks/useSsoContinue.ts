"use client";
import { signInWithCustomToken } from "firebase/auth";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client/api";
import { auth } from "@/lib/client/firebase";
import { dismissSso, exchangeSso, isSsoDismissed, peekSso, readSsoHint } from "@/lib/client/sso";
import { SELF, type SsoOffer } from "@/lib/sso/platforms";

/** Pages that carry the inline "Continue with ..." block instead of the floating card. */
export const SSO_INLINE_PAGES = ["/login", "/enroll"];

/** Offer + the "continue" action, shared by the floating card and the inline sign-in block. */
export function useSsoContinue({ signedIn, enabled = true, ignoreDismissed = false }: { signedIn: boolean; enabled?: boolean; ignoreDismissed?: boolean }) {
  const toast = useToast();
  const [offer, setOffer] = useState<SsoOffer | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (signedIn || !enabled || (!ignoreDismissed && isSsoDismissed()) || !readSsoHint().some((id) => id !== SELF)) { setOffer(null); return; }
    let alive = true;
    void peekSso().then((o) => alive && setOffer(o));
    return () => { alive = false; };
  }, [signedIn, enabled, ignoreDismissed]);

  const dismiss = () => { if (!ignoreDismissed) dismissSso(); setOffer(null); }; // on sign-in pages "Not now" only hides it for this visit

  const accept = async () => {
    if (!offer) return;
    setBusy(true);
    const res = await exchangeSso(offer.id);
    if (!res.ok) { toast("error", res.message); dismiss(); setBusy(false); return; }
    try {
      const cred = await signInWithCustomToken(auth, res.token);
      // Same hand-off a password sign-in makes: a fresh ID token becomes the httpOnly NPS session cookie.
      const session = await api("/api/auth/session", { method: "POST", json: { idToken: await cred.user.getIdToken(true) } });
      if (!session.ok) throw new Error(session.message);
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/go";
    } catch (e) {
      toast("error", e instanceof Error && e.message ? e.message : "Couldn't sign you in. Please use your password.");
      dismiss();
      setBusy(false);
    }
  };

  return { offer: signedIn ? null : offer, busy, accept, dismiss };
}
