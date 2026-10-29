export interface CspOptions {
  /** `next dev` needs eval (React Refresh) and websockets (HMR). Never set in production. */
  dev: boolean;
  /** NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: Firebase Auth opens a helper iframe on this host (proactively on iOS, Safari and mobile browsers). */
  authDomain?: string;
}

/**
 * Content-Security-Policy built per request around a fresh nonce.
 *
 * - Scripts: only our own bundles and scripts carrying the nonce (Next adds it to its own tags; the two inline <head> scripts get it in
 *   layout.tsx). 'strict-dynamic' lets those trusted scripts load their chunks; injected <script> tags and inline handlers are refused.
 * - Styles keep 'unsafe-inline' because React `style={{}}` attributes are used across the UI. Script injection is the real threat here.
 * - Payment redirects (Paystack / Credo hosted checkout) are top-level navigations, which CSP does not restrict, so no checkout origin is listed.
 */
export function buildCsp(nonce: string, { dev, authDomain }: CspOptions): string {
  const auth = authDomain ? [`https://${authDomain}`] : [];
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", "https://apis.google.com", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:", "https://res.cloudinary.com"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", "https://api.cloudinary.com", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://www.googleapis.com", ...auth, ...(dev ? ["ws:", "wss:"] : [])],
    "frame-src": ["'self'", ...auth],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const parts = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  if (!dev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

/** A fresh, unguessable value per request (base64 of a v4 UUID). */
export const makeNonce = (): string => btoa(crypto.randomUUID());
