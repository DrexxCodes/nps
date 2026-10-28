import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ERROR_MESSAGES } from "@/constants";

const STATUS: Record<string, number> = {
  UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, RATE_LIMITED: 429, INTERNAL: 500, VALIDATION_ERROR: 400,
  USERNAME_TAKEN: 409, ADMISSION_NUMBER_ALREADY_EXISTS: 409, PAYMENT_ALREADY_PROCESSED: 409, ORDER_ALREADY_DELIVERED: 409,
  BATCH_FULL: 409, NO_MORE_BATCHES: 409, ENROLLMENT_CLOSED: 403, COURSE_DURATION_EXCEEDED: 403, INSUFFICIENT_AVAILABLE_BALANCE: 409,
  SSO_DISABLED: 501, PAYMENT_INITIALIZATION_FAILED: 502, PAYMENT_VERIFICATION_FAILED: 502, INVALID_WEBHOOK_SIGNATURE: 401,
};

export class AppError extends Error {
  constructor(public code: string, public fields?: Record<string, string>, message?: string) {
    super(message ?? ERROR_MESSAGES[code] ?? code);
  }
}

export function ok<T extends object>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

/** Maps any thrown value to the standard error envelope. Internal details are logged, never returned. */
export function fail(err: unknown) {
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const i of err.issues) fields[i.path.join(".") || "_"] ??= i.message;
    return NextResponse.json({ ok: false, code: "VALIDATION_ERROR", message: ERROR_MESSAGES.VALIDATION_ERROR, fields }, { status: 400 });
  }
  if (err instanceof AppError) {
    return NextResponse.json({ ok: false, code: err.code, message: err.message, fields: err.fields }, { status: STATUS[err.code] ?? 400 });
  }
  console.error("[api] unhandled error", err instanceof Error ? err.message : "unknown");
  return NextResponse.json({ ok: false, code: "INTERNAL", message: ERROR_MESSAGES.INTERNAL }, { status: 500 });
}

/** Wraps a route handler with uniform error handling. */
export function route<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try { return await handler(...args); } catch (e) { return fail(e); }
  };
}
