import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { api } from "./api";

/** Signs in with Firebase, then trades the ID token for the httpOnly session cookie. */
export async function signInAndCreateSession(email: string, password: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const res = await api("/api/auth/session", { method: "POST", json: { idToken: await cred.user.getIdToken(true) } });
    return res.ok ? { ok: true } : { ok: false, message: res.message };
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    if (code === "auth/network-request-failed") return { ok: false, message: "You appear to be offline. Check your connection and try again." };
    if (code === "auth/too-many-requests") return { ok: false, message: "Too many attempts. Wait a few minutes or reset your password." };
    return { ok: false, message: "Email or password is incorrect." };
  }
}
