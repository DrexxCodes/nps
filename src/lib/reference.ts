import { randomInt } from "node:crypto";

/** NAPSS-NAU-{TIMESTAMP}-{RANDOM_LETTERS} using a CSPRNG. */
export function generateReference(now = Date.now()): string {
  const letters = Array.from({ length: 4 }, () => String.fromCharCode(65 + randomInt(26))).join("");
  return `NAPSS-NAU-${now}-${letters}`;
}
