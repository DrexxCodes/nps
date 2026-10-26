import "server-only";
import { z } from "zod";

const schema = z.object({
  ENV: z.string().default("DEV"),
  SCHOOL_TIMEZONE: z.string().default("Africa/Lagos"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().min(1),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  PAYSTACK_SECRET_KEY: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CRON_SECRET: z.string().min(16),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SES_FROM_EMAIL: z.string().optional(),
});

export type ServerEnv = z.infer<typeof schema>;
let cached: ServerEnv | null = null;

/** Validated lazily so `next build` works without secrets; fails loudly on first real use. */
export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid environment configuration. Check: ${missing}`);
  }
  if (parsed.data.ENV === "PROD") {
    const { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SES_FROM_EMAIL } = parsed.data;
    if (!AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_SES_FROM_EMAIL) throw new Error("AWS SES variables are required when ENV=PROD");
  }
  cached = parsed.data;
  return cached;
}

export const isProd = (): boolean => process.env.ENV === "PROD";
