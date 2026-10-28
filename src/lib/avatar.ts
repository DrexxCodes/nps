/**
 * Default profile picture for people who haven't uploaded one: a DiceBear "Lorelei" avatar generated on our own server
 * (`/api/avatar/[seed]`, using the locally installed @dicebear packages, no third-party request). Deterministic per seed.
 * Once a real photo is saved it is used instead and this is never requested.
 */
export const defaultAvatarUrl = (seed: string): string => `/api/avatar/${encodeURIComponent(seed)}`;

export const AVATAR_SEED_PATTERN = /^[\w .@+-]{1,100}$/;
