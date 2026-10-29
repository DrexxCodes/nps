import { describe, expect, it } from "vitest";
import { buildCsp, makeNonce } from "@/lib/csp";

const prod = (nonce = "abc123") => buildCsp(nonce, { dev: false, authDomain: "nps-demo.firebaseapp.com" });

describe("Content-Security-Policy", () => {
  it("allows scripts only from self and the request nonce, never unsafe-inline or eval in production", () => {
    const script = prod("N0NCE").split("; ").find((d) => d.startsWith("script-src "))!;
    expect(script).toContain("'nonce-N0NCE'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
  });
  it("blocks framing, plugins and base-tag hijacking", () => {
    const csp = prod();
    for (const d of ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "upgrade-insecure-requests"]) expect(csp).toContain(d);
  });
  it("lists the Firebase Auth helper frame and the Cloudinary hosts", () => {
    const csp = prod();
    expect(csp).toContain("frame-src 'self' https://nps-demo.firebaseapp.com");
    expect(csp).toContain("https://api.cloudinary.com");
    expect(csp).toContain("https://res.cloudinary.com");
  });
  it("only relaxes for development", () => {
    const dev = buildCsp("n", { dev: true });
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain("ws:");
    expect(dev).not.toContain("upgrade-insecure-requests");
  });
  it("makes a different nonce each time", () => {
    expect(makeNonce()).not.toBe(makeNonce());
    expect(makeNonce()).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});
