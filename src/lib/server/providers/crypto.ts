import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { AppError } from "../errors";

/** Provider secrets are sealed with AES-256-GCM before they touch Firestore, so a database export alone does not expose them. */
const rawKey = () => process.env.PROVIDER_SECRETS_KEY ?? "";
export const encryptionReady = (): boolean => rawKey().length >= 32;

function keyBytes(): Buffer {
  if (!encryptionReady()) throw new AppError("PROVIDER_SECRETS_KEY_MISSING");
  return createHash("sha256").update(rawKey()).digest();
}

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

/** Returns null (never throws) when the value is missing, tampered with, or sealed under a different key. */
export function open(sealed: string | undefined | null): string | null {
  if (!sealed) return null;
  try {
    const [version, iv, tag, data] = sealed.split(":");
    if (version !== "v1" || !iv || !tag || !data) return null;
    const decipher = createDecipheriv("aes-256-gcm", keyBytes(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export const maskSecret = (v: string | null | undefined): string => (v ? `••••${v.slice(-4)}` : "");
