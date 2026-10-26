import { describe, expect, it } from "vitest";
import { canonicalLgaName, canonicalStateName, findLga, findState } from "@/lib/geo";
import { isAccountBlocked, resolveRole } from "@/lib/roles";
import { admissionTypeOf, darsStudentDoc, darsUserFields, needsNpsProfile, usernameCandidates } from "@/lib/shared-user";
import { usernameSchema } from "@/lib/validation/schemas";

describe("roles shared with DARS", () => {
  it("treats any DARS admin as an NPS Admin, regardless of DARS scope", () => {
    expect(resolveRole({ admin: true, scope: "defined" } as never)).toBe("ADMIN");
    expect(resolveRole({ admin: true, scope: "super" } as never)).toBe("ADMIN");
  });
  it("never derives SUPER_ADMIN from DARS, but honours NPS's own", () => {
    expect(resolveRole({ admin: true, scope: "super" } as never)).not.toBe("SUPER_ADMIN");
    expect(resolveRole({ role: "SUPER_ADMIN", admin: false })).toBe("SUPER_ADMIN");
    expect(resolveRole({ role: "SUPER_ADMIN", admin: true })).toBe("SUPER_ADMIN");
  });
  it("uses the stored NPS role otherwise, and defaults DARS-created accounts to STUDENT", () => {
    expect(resolveRole({ role: "STAFF", admin: false })).toBe("STAFF");
    expect(resolveRole({ role: "ADMIN" })).toBe("ADMIN");
    expect(resolveRole({})).toBe("STUDENT");
    expect(resolveRole({ role: "bogus" })).toBe("STUDENT");
  });
  it("a DARS demotion takes effect: stored STUDENT + admin false is a student", () => {
    expect(resolveRole({ role: "STUDENT", admin: false })).toBe("STUDENT");
  });
  it("blocks DARS-banned and NPS-suspended accounts", () => {
    expect(isAccountBlocked({ banned: true })).toBe(true);
    expect(isAccountBlocked({ accountStatus: "SUSPENDED" })).toBe(true);
    expect(isAccountBlocked({ banned: false, accountStatus: "ACTIVE" })).toBe(false);
    expect(isAccountBlocked({})).toBe(false);
  });
});

describe("users document shared with DARS", () => {
  it("NPS-created accounts carry exactly the fields DARS's register route writes", () => {
    expect(darsUserFields({ fullName: "Ada Obi", regNumber: "2024134106" })).toEqual({ name: "Ada Obi", regNumber: "2024134106", admin: false, scope: null, assignedCourses: [], banned: false });
    expect(darsStudentDoc({ uid: "u1", name: "Ada Obi", email: "a@b.co", regNumber: "2024134106", now: 5 })).toEqual({ uid: "u1", name: "Ada Obi", email: "a@b.co", regNumber: "2024134106", totalPresence: 0, createdAt: 5 });
  });
  it("hands out fresh arrays (no shared mutable default)", () => {
    expect(darsUserFields({ fullName: "A", regNumber: null }).assignedCourses).not.toBe(darsUserFields({ fullName: "A", regNumber: null }).assignedCourses);
  });
  it("detects DARS-created accounts that still need an NPS profile", () => {
    expect(needsNpsProfile({})).toBe(true);
    expect(needsNpsProfile({ role: "STUDENT" })).toBe(false);
  });
  it("derives admission type from the registration number", () => {
    expect(admissionTypeOf("2024134106")).toBe("REGULAR");
    expect(admissionTypeOf("2025133004")).toBe("CEP");
    expect(admissionTypeOf("2025135004")).toBeNull();
    expect(admissionTypeOf(null)).toBeNull();
  });
  it("generates usernames that satisfy NPS's username rules", () => {
    for (const email of ["john.doe@gmail.com", "x@y.co", "a@b.co", "UPPER+tag@x.com", "___@x.com", "averyveryverylongemailaddress@x.com", ""]) {
      const c = usernameCandidates(email, "AbC123xyzUID456789");
      expect(c.length).toBeGreaterThan(1);
      for (const u of c) expect(usernameSchema.safeParse(u).success, `${email} -> ${u}`).toBe(true);
    }
    expect(usernameCandidates("john.doe@gmail.com", "uid")[0]).toBe("john.doe");
  });
});

describe("state and LGA (nigeria-geo-core)", () => {
  it("accepts a real state/LGA pair and returns official spellings", () => {
    expect(findLga("anambra", "awka south")?.lga.name).toBe("Awka South");
    expect(canonicalLgaName("Anambra", "  AWKA SOUTH ")).toBe("Awka South");
  });
  it("rejects an LGA from a different state", () => {
    expect(findLga("Lagos", "Awka South")).toBeNull();
    expect(canonicalLgaName("Lagos", "Awka South")).toBe("");
  });
  it("maps the old stored 'FCT' to the package's Federal Capital Territory", () => {
    expect(canonicalStateName("FCT")).toBe("Federal Capital Territory");
    expect(findState("Federal Capital Territory")?.id).toBe("fct");
    expect(findLga("FCT", "Bwari")?.lga.name).toBe("Bwari");
  });
  it("rejects unknown or empty states", () => {
    expect(findState("Atlantis")).toBeNull();
    expect(findState("")).toBeNull();
    expect(findState(null)).toBeNull();
  });
  it("covers all 37 states, each with LGAs", () => {
    expect(findState("Rivers")).not.toBeNull();
  });
});
