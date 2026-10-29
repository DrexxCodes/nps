/**
 * payment.ts: verify a payment reference against Credo or Paystack with a raw curl request and log the full response.
 *
 *   pnpm payment                      (asks for everything)
 *   pnpm payment -- --provider credo --env sandbox --ref NAPSS-NAU-1730000000000-ABCD
 *
 * It mirrors exactly what the app does in src/lib/server/providers/{credo,paystack}.ts:
 *
 *   Credo     GET {base}/transaction/{reference}/verify      Authorization: <SECRET KEY>   (no "Bearer")
 *             base = https://api.credodemo.com (sandbox) | https://api.credocentral.com (production)
 *             The app verifies by Credo's own reference (transRef / credoReference) and falls back to our
 *             NAPSS-NAU-... reference for older records, so either can be entered here.
 *
 *   Paystack  GET https://api.paystack.co/transaction/verify/{reference}   Authorization: Bearer <SECRET KEY>
 *             Paystack has no environment switch: test vs live is decided by the key (sk_test_... / sk_live_...).
 *
 * "Admin switch" mock: in the platform admin, Credo has a sandbox/production toggle. Here the same toggle is the
 * environment prompt (or --env), which picks the base URL AND the matching secret key. For Paystack the toggle
 * picks the test or live key. Keys are read from .env.local (never hard-coded); any that is missing is asked for.
 *
 *   CREDO_SANDBOX_SECRET_KEY      CREDO_PRODUCTION_SECRET_KEY
 *   PAYSTACK_TEST_SECRET_KEY      PAYSTACK_LIVE_SECRET_KEY      (PAYSTACK_SECRET_KEY works as a fallback)
 *
 * Run: pnpm payment   (Node 22.18+ / 24 runs .ts natively; no extra dependencies)
 */
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

type Provider = "credo" | "paystack";
type Environment = "sandbox" | "production";

// Same values as src/constants/payment-providers.ts
const CREDO_BASE_URLS: Record<Environment, string> = { sandbox: "https://api.credodemo.com", production: "https://api.credocentral.com" };
const PAYSTACK_BASE = "https://api.paystack.co";
const TIMEOUT_SECONDS = 15; // PROVIDER_REQUEST_TIMEOUT_MS

const flag = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const rl = createInterface({ input: stdin, output: stdout });
const ask = async (q: string): Promise<string> => (await rl.question(q)).trim().replace(/^["']|["']$/g, "");

async function choose<T extends string>(title: string, options: readonly T[], given?: string): Promise<T> {
  if (given) {
    const hit = options.find((o) => o === given.toLowerCase() || o.startsWith(given.toLowerCase()));
    if (hit) return hit;
    console.error(`Unknown ${title} "${given}". Choose one of: ${options.join(", ")}`);
  }
  for (;;) {
    console.log(`\n${title}:`);
    options.forEach((o, i) => console.log(`  ${i + 1}) ${o}`));
    const a = (await ask("> ")).toLowerCase();
    const hit = options.find((o, i) => a === String(i + 1) || a === o || (a.length > 0 && o.startsWith(a)));
    if (hit) return hit;
    console.log("Pick a number or name from the list.");
  }
}

/** The key for the selected provider + environment, from the environment or, failing that, a prompt. */
async function secretKeyFor(provider: Provider, env: Environment): Promise<string> {
  const names = provider === "credo"
    ? [env === "sandbox" ? "CREDO_SANDBOX_SECRET_KEY" : "CREDO_PRODUCTION_SECRET_KEY"]
    : [env === "sandbox" ? "PAYSTACK_TEST_SECRET_KEY" : "PAYSTACK_LIVE_SECRET_KEY", "PAYSTACK_SECRET_KEY"];
  for (const n of names) {
    const v = process.env[n]?.trim().replace(/^["']|["']$/g, "");
    if (v) {
      // Paystack's key decides the mode, so make sure the chosen environment and the key agree.
      if (provider === "paystack" && n === "PAYSTACK_SECRET_KEY") {
        const mode = v.startsWith("sk_live_") ? "production" : "sandbox";
        if (mode !== env) { console.log(`(PAYSTACK_SECRET_KEY is a ${mode} key, not ${env}; ignoring it)`); continue; }
      }
      console.log(`Using ${n} from the environment.`);
      return v;
    }
  }
  return ask(`Enter the ${provider} ${env} SECRET key (not saved anywhere): `);
}

const mask = (s: string): string => (s.length <= 8 ? "****" : `${s.slice(0, 7)}...${s.slice(-3)}`);

function curl(args: string[]): Promise<{ code: number | null; out: string; err: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn("curl", args, { stdio: ["ignore", "pipe", "pipe"] }); // no shell, so nothing in the reference can be interpreted
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", (e) => reject(new Error(`Could not run curl (${e.message}). Is curl installed?`)));
    p.on("close", (code) => resolve({ code, out, err }));
  });
}

async function main() {
  console.log("Payment reference checker (Credo / Paystack)");
  const provider = await choose<Provider>("Provider", ["credo", "paystack"], flag("provider"));
  const envLabel = provider === "credo" ? "Credo environment (the admin sandbox/production switch)" : "Paystack mode (decided by the key: test = sk_test_, live = sk_live_)";
  const env = await choose<Environment>(envLabel, ["sandbox", "production"], flag("env"));

  let reference = flag("ref") ?? "";
  while (!reference) reference = await ask(`\nEnter the ${provider} reference: `);
  const secretKey = await secretKeyFor(provider, env);
  rl.close();
  if (!secretKey) { console.error("No secret key provided."); process.exit(1); }

  if (provider === "paystack") {
    if (!/^sk_(test|live)_[A-Za-z0-9]+$/.test(secretKey)) { console.error("The Paystack secret key must look like sk_test_... or sk_live_... (no quotes or spaces)."); process.exit(1); }
    const keyMode = secretKey.startsWith("sk_live_") ? "production" : "sandbox";
    if (keyMode !== env) console.log(`\nWarning: you selected ${env} but this is a ${keyMode} key. Paystack will use the key's mode.`);
  }

  const url = provider === "credo"
    ? `${CREDO_BASE_URLS[env]}/transaction/${encodeURIComponent(reference)}/verify`
    : `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`;
  const authorization = provider === "credo" ? secretKey : `Bearer ${secretKey}`; // Credo sends the bare key, Paystack uses Bearer

  console.log(`\n$ curl -sS -i -X GET '${url}' \\\n    -H 'Authorization: ${provider === "credo" ? mask(secretKey) : `Bearer ${mask(secretKey)}`}' -H 'Content-Type: application/json'\n`);

  // -i includes the response headers; -w appends the status and timing after the body.
  const marker = "\n--CURL-STATS--";
  const { code, out, err } = await curl([
    "-sS", "-i", "-X", "GET", url,
    "-H", `Authorization: ${authorization}`,
    "-H", "Content-Type: application/json",
    "--max-time", String(TIMEOUT_SECONDS),
    "-w", `${marker}http_code=%{http_code} time_total=%{time_total}s remote_ip=%{remote_ip}\n`,
  ]);

  if (code !== 0) {
    console.error(`curl failed (exit ${code}): ${err.trim() || "no error output"}`);
    process.exit(1);
  }

  const [raw = "", stats = ""] = out.split(marker);
  // Skip any interim "HTTP/1.1 100 Continue" / proxy blocks: the last header block is the real one.
  const blocks = raw.replace(/\r\n/g, "\n").split(/\n\n(?=HTTP\/)/);
  const last = blocks[blocks.length - 1] ?? "";
  const split = last.indexOf("\n\n");
  const headers = split === -1 ? last : last.slice(0, split);
  const body = split === -1 ? "" : last.slice(split + 2);

  console.log("---- RESPONSE HEADERS ----");
  console.log(headers.trim());
  console.log("\n---- RESPONSE BODY ----");
  try { console.log(JSON.stringify(JSON.parse(body), null, 2)); } catch { console.log(body.trim() || "(empty body)"); }
  console.log(`\n---- ${stats.trim()} ----`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
