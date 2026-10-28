import { z } from "zod";
import { ADMISSION_TYPES, BATCH_STATUSES, ITEM_STATUSES, MAX_ACTIVE_SOCIAL_LINKS, MAX_BIO_LENGTH, MAX_CLASS_YEAR, MAX_VARIANT_OPTIONS, MAX_VARIANT_SETS, NFC_FIELDS, REQUIREMENT_TYPES, SOCIAL_PLATFORMS, VARIANT_SELECTION_MODES } from "@/constants";

const dobString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD").refine((v) => {
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return false;
  const age = (Date.now() - d.getTime()) / (365.25 * 864e5);
  return age >= 14 && age <= 80;
}, "Enter a valid date of birth");

export const usernameSchema = z.string().trim().min(3, "At least 3 characters").max(20, "At most 20 characters").regex(/^[a-zA-Z0-9_.]+$/, "Letters, numbers, dots and underscores only");

export const enrollmentSchema = z.object({
  admissionType: z.enum(ADMISSION_TYPES),
  fullName: z.string().trim().min(3, "Enter your full name").max(80),
  username: usernameSchema,
  email: z.email("Enter a valid email").transform((v) => v.trim().toLowerCase()),
  phone: z.string().trim().min(10, "Enter a valid phone number").max(20),
  noAdmissionNumber: z.boolean(),
  admissionNumber: z.string().trim().optional(),
  dateOfBirth: dobString,
  password: z.string().min(8, "At least 8 characters").max(128),
  acceptTerms: z.literal(true, { error: "You must accept the terms and privacy notice" }),
}).refine((v) => v.noAdmissionNumber || !!v.admissionNumber, { path: ["admissionNumber"], message: "Enter your admission number or tick the box" });
export type EnrollmentInput = z.infer<typeof enrollmentSchema>;

export const admissionNumberSchema = z.object({ admissionNumber: z.string().trim() });

const emergencyContact = z.object({ name: z.string().trim().min(2).max(80), relationship: z.string().trim().min(2).max(40), phone: z.string().trim().min(10).max(20) });

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(3).max(80).optional(),
  username: usernameSchema.optional(),
  phone: z.string().trim().min(10).max(20).optional(),
  dateOfBirth: dobString.optional(),
  bio: z.string().max(MAX_BIO_LENGTH).optional(),
  socialLinks: z.partialRecord(z.enum(SOCIAL_PLATFORMS), z.string().max(300)).optional(),
  activeSocialLinks: z.array(z.enum(SOCIAL_PLATFORMS)).max(MAX_ACTIVE_SOCIAL_LINKS).optional(),
  birthdayVisibility: z.boolean().optional(),
  emergencyContacts: z.array(emergencyContact).max(3).optional(),
  allergies: z.string().max(300).optional(),
  stateOfOrigin: z.string().trim().min(2).max(40).optional(), // pair with localGovernmentArea is checked against nigeria-geo-core in /api/profile
  localGovernmentArea: z.string().trim().min(2).max(80).optional(),
  profileImage: z.object({ publicId: z.string().min(1).max(200) }).optional(),
}).strict();

export const bankSchema = z.object({ bankCode: z.string().min(2).max(10), accountNumber: z.string().regex(/^\d{10}$/, "Account numbers have 10 digits") });

/** One optional price per class (academic year). `minKobo` is 1 for an item's own price (a free item can't be paid for) and 0 for sub-items. */
const classPricesSchema = (minKobo: number) =>
  z.array(z.object({ year: z.number().int().min(1).max(MAX_CLASS_YEAR), priceKobo: z.number().int().min(minKobo).max(1e10) })).max(MAX_CLASS_YEAR)
    .refine((v) => new Set(v.map((c) => c.year)).size === v.length, "Each class can only have one price").default([]);

const variantOptionSchema = z.object({ id: z.string().min(1).max(40), label: z.string().trim().min(1, "Values can't be empty").max(60) });
const variantSetSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(1, "Give every variable set a name").max(60),
  selection: z.enum(VARIANT_SELECTION_MODES),
  required: z.boolean(),
  options: z.array(variantOptionSchema).min(1, "Add at least one value to every variable set").max(MAX_VARIANT_OPTIONS),
}).refine((v) => new Set(v.options.map((o) => o.label.toLowerCase())).size === v.options.length && new Set(v.options.map((o) => o.id)).size === v.options.length,
  { path: ["options"], message: "Values in a variable set must be different" });

const subItemSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(80),
  description: z.string().max(200).default(""),
  priceKobo: z.number().int().min(0).max(1e10),
  required: z.boolean(),
  classPrices: classPricesSchema(0),
});

export const itemSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(1000).default(""),
  coverImageUrl: z.url().nullable().default(null),
  status: z.enum(ITEM_STATUSES).default("DRAFT"),
  startAt: z.number().int().nullable().default(null),
  endAt: z.number().int().nullable().default(null),
  hasSubItems: z.boolean().default(false),
  subItems: z.array(subItemSchema).max(30).default([]),
  basePriceKobo: z.number().int().min(0).max(1e10).default(0),
  classPrices: classPricesSchema(1),
  variantSets: z.array(variantSetSchema).max(MAX_VARIANT_SETS).default([]),
  requiredProfileFields: z.array(z.enum(REQUIREMENT_TYPES)).default([]),
  physical: z.boolean().default(true),
  batchProcessingEnabled: z.boolean().default(false),
  batchSize: z.number().int().min(1).max(100000).default(50),
  batchLimitEnabled: z.boolean().default(false),
  maxBatches: z.number().int().min(1).max(10000).default(1),
  nfcEnabled: z.boolean().default(false),
  nfcPayloadFields: z.array(z.enum(NFC_FIELDS)).default(["PROFILE_URL"]),
}).refine((v) => !v.startAt || !v.endAt || v.endAt > v.startAt, { path: ["endAt"], message: "End must be after start" })
  .refine((v) => (v.hasSubItems ? v.subItems.length > 0 : v.basePriceKobo > 0), { path: ["basePriceKobo"], message: "Set a price or add sub-items" })
  .refine((v) => new Set(v.variantSets.map((x) => x.name.toLowerCase())).size === v.variantSets.length, { path: ["variantSets"], message: "Variable set names must be different" })
  // Nothing to collect means nothing to batch or encode: enforce it here so no client can create the contradiction.
  .transform((v) => (v.physical ? v : { ...v, batchProcessingEnabled: false, nfcEnabled: false }));
export type ItemInput = z.infer<typeof itemSchema>;

export const checkoutSchema = z.object({
  itemId: z.string().min(1),
  subItemIds: z.array(z.string()).default([]),
  /** variable set id -> chosen value ids; validated against the item's sets on the server */
  variants: z.record(z.string().max(40), z.array(z.string().max(40)).max(MAX_VARIANT_OPTIONS)).default({}),
});
export const verifySchema = z.object({ reference: z.string().regex(/^NAPSS-NAU-\d+-[A-Z]{2,}$/) });

export const settingsSchema = z.object({
  enrollmentOpen: z.boolean(),
  courseDurationYears: z.union([z.literal(4), z.literal(5), z.literal(6)]),
  academicSessionStartMonth: z.number().int().min(1).max(12),
  schoolTimezone: z.string().min(3).max(60),
  platformFeeEnabled: z.boolean(),
  platformFeePercentage: z.number().min(0).max(20),
  platformFeeFlatKobo: z.number().int().min(0).max(1e7),
});

export const batchStatusSchema = z.object({ status: z.enum(BATCH_STATUSES) });
export const batchSizeSchema = z.object({ maxOrders: z.number().int().min(1).max(100000) });
const lookupEmail = z.email("Enter a valid email").transform((v) => v.trim().toLowerCase());
export const staffAssignSchema = z.object({ email: lookupEmail, action: z.enum(["ASSIGN", "REMOVE"]).default("ASSIGN") });
export const roleChangeSchema = z.object({ email: lookupEmail, role: z.enum(["ADMIN", "STAFF", "STUDENT"]), reason: z.string().trim().min(3).max(200) });
/** Permanent account deletion (Super Admin). `confirmEmail` must repeat `email` exactly: the typed confirmation. */
export const deleteUserSchema = z.object({ email: lookupEmail, confirmEmail: lookupEmail, reason: z.string().trim().min(3).max(200) });
export const exportSchema = z.object({
  itemId: z.string().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fulfillment: z.enum(["ALL", "AWAITING", "DELIVERED"]).default("ALL"),
});
export const orderSearchSchema = z.object({ q: z.string().trim().min(3).max(254) }); // reg number, reference or email
