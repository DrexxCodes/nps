export const APP_NAME = "NPS";
export const APP_FULL_NAME = "NAPSS Payment Suite";
export const DEVELOPER = "Drexx Technologies";
export const RIGHTS = "NAPSS, UNIZIK";
export const CURRENCY = "NGN";
export const SESSION_COOKIE = "nps_session";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5;
export const RESERVATION_TTL_MS = 1000 * 60 * 30;
export const MAX_ACTIVE_SOCIAL_LINKS = 4;
export const MAX_BIO_LENGTH = 280;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ADMISSION_CODES = { REGULAR: "134", CEP: "133" } as const;
export const ADMISSION_TYPES = ["REGULAR", "CEP"] as const;
export const ROLES = ["SUPER_ADMIN", "ADMIN", "STAFF", "STUDENT"] as const;
export const ITEM_STATUSES = ["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "ENDED", "SUSPENDED", "ARCHIVED"] as const;
export const BATCH_STATUSES = ["QUEUED", "PROCESSING", "READY_FOR_PICKUP"] as const;
export const SOCIAL_PLATFORMS = ["whatsapp", "facebook", "tiktok", "snapchat", "linkedin", "instagram", "github"] as const;
export const REQUIREMENT_TYPES = ["PROFILE_PICTURE", "ADMISSION_NUMBER", "BANK_ACCOUNT"] as const;
export const NFC_FIELDS = ["PROFILE_URL", "ADMISSION_NUMBER", "EMAIL", "PHONE", "ACADEMIC_YEAR"] as const;

/** Variable sets (size, colour...): can a student pick one value or several from a set? */
export const VARIANT_SELECTION_MODES = ["SINGLE", "MULTIPLE"] as const;
export const VARIANT_SELECTION_LABELS: Record<(typeof VARIANT_SELECTION_MODES)[number], { admin: string; student: string }> = {
  SINGLE: { admin: "Pick one value", student: "Choose one" },
  MULTIPLE: { admin: "Pick as many as apply", student: "Choose any that apply" },
};
export const MAX_VARIANT_SETS = 10;
export const MAX_VARIANT_OPTIONS = 50;
/** Highest class (academic year) a class price can target. Platform course duration is 4-6 years. */
export const MAX_CLASS_YEAR = 6;

export const REQUIREMENT_LABELS: Record<(typeof REQUIREMENT_TYPES)[number], string> = {
  PROFILE_PICTURE: "Profile picture",
  ADMISSION_NUMBER: "Admission number",
  BANK_ACCOUNT: "Bank account details",
};

export const DEFAULT_PLATFORM_SETTINGS = {
  enrollmentOpen: true,
  courseDurationYears: 4,
  academicSessionStartMonth: 10,
  schoolTimezone: "Africa/Lagos",
  platformFeeEnabled: false,
  platformFeePercentage: 0,
  platformFeeFlatKobo: 0,
  currency: CURRENCY,
  feeConfigVersion: 1,
} as const;

export const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Please sign in to continue.",
  FORBIDDEN: "You do not have access to this resource.",
  ENROLLMENT_CLOSED: "Enrollment is currently closed.",
  INVALID_ADMISSION_NUMBER: "Admission numbers must be exactly 10 digits (YYYYCCCNNN).",
  ADMISSION_CODE_MISMATCH: "This admission number does not match the selected admission type.",
  ADMISSION_NUMBER_ALREADY_EXISTS: "That admission number is already registered. If you signed up on DARS, sign in with the same email and password.",
  COURSE_DURATION_EXCEEDED: "You're supposed to have graduated. Contact an administrator for manual registration.",
  USERNAME_TAKEN: "That username is already taken.",
  ITEM_NOT_AVAILABLE: "This item is not available for purchase.",
  PROFILE_REQUIREMENTS_MISSING: "This item requires some information that's not included in your account at the moment.",
  BATCH_FULL: "This batch is full.",
  NO_MORE_BATCHES: "No more batches left for this item.",
  PAYMENT_INITIALIZATION_FAILED: "We could not start your payment. Please try again.",
  PAYMENT_VERIFICATION_FAILED: "We could not verify this payment yet.",
  PAYMENT_ALREADY_PROCESSED: "This payment has already been processed.",
  INVALID_WEBHOOK_SIGNATURE: "Invalid signature.",
  INSUFFICIENT_AVAILABLE_BALANCE: "The requested amount exceeds the available balance.",
  WITHDRAWAL_FAILED: "The withdrawal could not be completed.",
  NFC_NOT_SUPPORTED: "NFC is not supported on this device or browser.",
  ORDER_NOT_READY_FOR_PICKUP: "This item isn't ready yet. Its batch must be marked Ready for pickup before it can be delivered.",
  ORDER_ALREADY_DELIVERED: "This order has already been delivered.",
  VALIDATION_ERROR: "Some fields need attention.",
  NOT_FOUND: "We could not find what you were looking for.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  INTERNAL: "Something went wrong on our side. Please try again.",
};
