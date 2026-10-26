import { ADMISSION_CODES } from "@/constants";
import type { AdmissionType } from "@/types";

export type AdmissionCheck =
  | { ok: true; year: number; code: string; registration: string }
  | { ok: false; code: "INVALID_ADMISSION_NUMBER" | "ADMISSION_CODE_MISMATCH" };

/** Validates YYYYCCCNNN against the selected admission type. Pure; used on client and server. */
export function validateAdmissionNumber(value: string, type: AdmissionType, now: Date = new Date()): AdmissionCheck {
  if (!/^\d{10}$/.test(value)) return { ok: false, code: "INVALID_ADMISSION_NUMBER" };
  const year = Number(value.slice(0, 4));
  const code = value.slice(4, 7);
  const registration = value.slice(7);
  if (year < 2000 || year > now.getUTCFullYear() + 1) return { ok: false, code: "INVALID_ADMISSION_NUMBER" };
  if (code !== ADMISSION_CODES[type]) return { ok: false, code: "ADMISSION_CODE_MISMATCH" };
  return { ok: true, year, code, registration };
}

/** Academic year number from the admission year, using the October session boundary. */
export function academicYear(admissionYear: number, reference: Date, sessionStartMonth = 10): number {
  const y = reference.getUTCFullYear();
  const month = reference.getUTCMonth() + 1;
  return month >= sessionStartMonth ? y - admissionYear + 1 : y - admissionYear;
}

export function exceedsCourseDuration(admissionYear: number, reference: Date, durationYears: number, sessionStartMonth = 10): boolean {
  return academicYear(admissionYear, reference, sessionStartMonth) > durationYears;
}

export function admissionYearOf(admissionNumber: string | null): number | null {
  return admissionNumber && /^\d{10}$/.test(admissionNumber) ? Number(admissionNumber.slice(0, 4)) : null;
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/** Normalizes Nigerian phone numbers to +234XXXXXXXXXX. Returns null when invalid. */
export function normalizePhone(value: string): string | null {
  const digits = value.replace(/[^\d+]/g, "");
  let national: string;
  if (digits.startsWith("+234")) national = digits.slice(4);
  else if (digits.startsWith("234")) national = digits.slice(3);
  else if (digits.startsWith("0")) national = digits.slice(1);
  else national = digits;
  return /^\d{10}$/.test(national) ? `+234${national}` : null;
}
