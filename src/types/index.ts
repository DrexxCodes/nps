import type { ADMISSION_TYPES, BATCH_STATUSES, ITEM_STATUSES, NFC_FIELDS, REQUIREMENT_TYPES, ROLES, SOCIAL_PLATFORMS, VARIANT_SELECTION_MODES } from "@/constants";

export type Role = (typeof ROLES)[number];
export type AdmissionType = (typeof ADMISSION_TYPES)[number];
export type ItemStatus = (typeof ITEM_STATUSES)[number];
export type BatchStatus = (typeof BATCH_STATUSES)[number];
export type RequirementType = (typeof REQUIREMENT_TYPES)[number];
export type NfcField = (typeof NFC_FIELDS)[number];
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export type VariantSelectionMode = (typeof VARIANT_SELECTION_MODES)[number];
export type PaymentStatus = "PENDING" | "INITIALIZED" | "SUCCESSFUL" | "FAILED" | "ABANDONED" | "REVERSED" | "REFUNDED";
export type FulfillmentStatus = "AWAITING" | "DELIVERED";

export interface PlatformSettings {
  enrollmentOpen: boolean;
  courseDurationYears: 4 | 5 | 6;
  academicSessionStartMonth: number;
  schoolTimezone: string;
  platformFeeEnabled: boolean;
  platformFeePercentage: number;
  platformFeeFlatKobo: number;
  currency: string;
  feeConfigVersion: number;
}

/** Price override for one class (academic year). Classes without an override pay the initial price. */
export interface ClassPrice {
  year: number;
  priceKobo: number;
}

export interface VariantOption {
  id: string;
  label: string;
}

/** An admin-defined set of values (e.g. Size: S, M, L) that students choose from at checkout. */
export interface VariantSet {
  id: string;
  name: string;
  selection: VariantSelectionMode;
  required: boolean;
  options: VariantOption[];
}

/** What a student picked, snapshotted with names so later edits to the item never rewrite order history. */
export interface SelectedVariant {
  setId: string;
  setName: string;
  options: VariantOption[];
}

export interface SubItem {
  id: string;
  name: string;
  description: string;
  priceKobo: number;
  required: boolean;
  /** Admin-only. Always stripped (see `toStudentItem`) before an item reaches a student or an order snapshot. */
  classPrices?: ClassPrice[];
}

export interface Item {
  id: string;
  name: string;
  description: string;
  coverImageUrl: string | null;
  ownerAdminId: string;
  status: ItemStatus;
  startAt: number | null;
  endAt: number | null;
  hasSubItems: boolean;
  subItems: SubItem[];
  basePriceKobo: number;
  /** Admin-only class overrides of `basePriceKobo`. Always [] on student-facing items. */
  classPrices: ClassPrice[];
  variantSets: VariantSet[];
  requiredProfileFields: RequirementType[];
  batchProcessingEnabled: boolean;
  batchSize: number;
  batchLimitEnabled: boolean;
  maxBatches: number;
  nfcEnabled: boolean;
  nfcPayloadFields: NfcField[];
  assignedStaffIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface FeeSnapshot {
  version: number;
  enabled: boolean;
  percentage: number;
  flatKobo: number;
}

export interface Pricing {
  subtotalKobo: number;
  platformFeeKobo: number;
  otherFeesKobo: number;
  totalKobo: number;
  feeSnapshot: FeeSnapshot;
}

export interface SessionUser {
  uid: string;
  role: Role;
  email: string | null;
}

export interface PublicProfile {
  fullName: string;
  admissionNumber: string;
  profileImageUrl: string | null;
  /** The uploaded photo, or a DiceBear Micah avatar until they upload one. Always safe to render. */
  avatarUrl: string;
  academicYear: number | null;
  bio: string;
  birthday: string | null;
  socials: { platform: SocialPlatform; url: string }[];
}

export interface ApiError {
  ok: false;
  code: string;
  message: string;
  fields?: Record<string, string>;
}
export type ApiResult<T> = ({ ok: true } & T) | ApiError;
