import type { SocialPlatform } from "@/types";

const HOSTS: Record<SocialPlatform, string[]> = {
  whatsapp: ["wa.me", "api.whatsapp.com", "chat.whatsapp.com", "whatsapp.com"],
  facebook: ["facebook.com", "fb.com", "fb.me"],
  tiktok: ["tiktok.com"],
  snapchat: ["snapchat.com"],
  linkedin: ["linkedin.com"],
  instagram: ["instagram.com"],
  github: ["github.com"],
};

/** Returns a safe https URL or null. WhatsApp also accepts a bare phone number. */
export function normalizeSocialUrl(platform: SocialPlatform, input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (platform === "whatsapp" && /^\+?[\d\s-]{10,15}$/.test(value)) {
    const d = value.replace(/\D/g, "");
    const intl = d.startsWith("234") ? d : d.startsWith("0") ? `234${d.slice(1)}` : d;
    return `https://wa.me/${intl}`;
  }
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
    return HOSTS[platform].some((h) => host === h || host.endsWith(`.${h}`)) ? url.toString() : null;
  } catch {
    return null;
  }
}
