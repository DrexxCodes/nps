import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createAvatar } from "@dicebear/core";
import * as lorelei from "@dicebear/lorelei";
import { AVATAR_SEED_PATTERN, defaultAvatarUrl } from "@/lib/avatar";
import { avatarSeedOf, buildPublicProfileFields } from "@/lib/server/public-profile";

const user = {
  fullName: "Ada Obi", email: "Ada@Example.com", bio: "Hi", dateOfBirth: "2003-05-17", birthdayVisibility: true, profileImageUrl: null,
  socialLinks: { github: "https://github.com/ada", instagram: "https://instagram.com/ada" }, activeSocialLinks: ["github"], accountStatus: "ACTIVE",
  phone: "+2348000000000", allergies: "peanuts", bankDetails: { accountNumber: "0123456789" },
};

describe("buildPublicProfileFields", () => {
  it("projects only public fields and never leaks private data", () => {
    const out = buildPublicProfileFields(user, 1);
    expect(out).toEqual({ fullName: "Ada Obi", profileImageUrl: null, bio: "Hi", birthday: "05-17", socials: [{ platform: "github", url: "https://github.com/ada" }], avatarSeed: avatarSeedOf("ada@example.com"), hidden: false, syncedAt: 1 });
    const text = JSON.stringify(out);
    for (const secret of ["2003", "ada@example.com", "2348000000000", "peanuts", "0123456789"]) expect(text.toLowerCase()).not.toContain(secret.toLowerCase());
  });

  it("hides the birthday unless the student opted in, and drops inactive or invalid social links", () => {
    expect(buildPublicProfileFields({ ...user, birthdayVisibility: false }).birthday).toBeNull();
    expect(buildPublicProfileFields({ ...user, activeSocialLinks: ["instagram"], socialLinks: { instagram: "https://evil.example/ada" } }).socials).toEqual([]);
  });

  it("flags suspended accounts as hidden", () => {
    expect(buildPublicProfileFields({ ...user, accountStatus: "SUSPENDED" }).hidden).toBe(true);
  });
});

describe("default avatar", () => {
  it("is a local, stable URL whose seed is a hash, so the email never appears in it", () => {
    const seed = avatarSeedOf("  ADA@example.com ");
    expect(seed).toBe(avatarSeedOf("ada@example.com"));
    const url = defaultAvatarUrl(seed);
    expect(url).toBe(`/api/avatar/${seed}`);
    expect(url).not.toContain("ada");
    expect(AVATAR_SEED_PATTERN.test(seed)).toBe(true);
  });

  it("generates the same Lorelei SVG for the same seed, locally", () => {
    const a = createAvatar(lorelei, { seed: "abc" }).toString();
    expect(a.startsWith("<svg")).toBe(true);
    expect(createAvatar(lorelei, { seed: "abc" }).toString()).toBe(a);
    expect(createAvatar(lorelei, { seed: "abd" }).toString()).not.toBe(a);
  });
});
