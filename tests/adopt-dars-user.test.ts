import { beforeEach, describe, expect, it, vi } from "vitest";

// Minimal in-memory Firestore that enforces the real transaction rule: every read must come before the first write.
const store = new Map<string, Record<string, unknown>>();
const snap = (path: string) => ({ exists: store.has(path), data: () => (store.has(path) ? structuredClone(store.get(path)) : undefined) });
const ref = (path: string) => ({ path, get: async () => snap(path) });
const fakeDb = {
  doc: ref,
  runTransaction: async <T,>(fn: (tx: unknown) => Promise<T>) => {
    let wrote = false;
    const guard = () => { if (wrote) throw new Error("Firestore transactions require all reads to be executed before all writes."); };
    const pending: (() => void)[] = [];
    const tx = {
      get: async (r: { path: string }) => { guard(); return snap(r.path); },
      getAll: async (...rs: { path: string }[]) => { guard(); return rs.map((r) => snap(r.path)); },
      set: (r: { path: string }, d: Record<string, unknown>, o?: { merge?: boolean }) => { wrote = true; pending.push(() => store.set(r.path, o?.merge ? { ...(store.get(r.path) ?? {}), ...d } : d)); },
    };
    const out = await fn(tx);
    pending.forEach((f) => f());
    return out;
  },
};
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/firebase-admin", () => ({ db: () => fakeDb, adminAuth: () => ({ getUser: async (uid: string) => ({ uid, email: "ada@example.com", displayName: "Ada", emailVerified: false }) }) }));

import { adoptDarsUser, loadUserForSession } from "@/lib/server/shared-user";
import { resolveRole } from "@/lib/roles";

const darsDoc = (over: Record<string, unknown> = {}) => ({ uid: "u1", email: "ada@example.com", name: "Ada Obi", regNumber: "2024134106", admin: false, scope: null, assignedCourses: [], banned: false, createdAt: 123, ...over });

beforeEach(() => store.clear());

describe("adoptDarsUser (DARS-created account signing in to NPS)", () => {
  it("completes the NPS profile without touching DARS fields", async () => {
    store.set("users/u1", darsDoc());
    const u = await adoptDarsUser("u1");
    const saved = store.get("users/u1")!;
    expect(saved).toMatchObject({ uid: "u1", name: "Ada Obi", regNumber: "2024134106", admin: false, scope: null, assignedCourses: [], banned: false, createdAt: 123 });
    expect(saved).toMatchObject({ role: "STUDENT", fullName: "Ada Obi", username: "ada", usernameNormalized: "ada", admissionNumber: "2024134106", admissionType: "REGULAR", admissionStatus: "PROVIDED", accountStatus: "ACTIVE", phone: null, dateOfBirth: null });
    expect(store.get("usernames/ada")).toEqual({ uid: "u1" });
    expect(store.get("admissionNumbers/2024134106")).toMatchObject({ uid: "u1", fullName: "Ada Obi", profileImageUrl: null, bio: "", birthday: null, socials: [] });
    expect(store.get("auditLogs/link_u1")).toMatchObject({ action: "ACCOUNT_LINKED_FROM_DARS" });
    expect(u).toMatchObject({ role: "STUDENT", username: "ada" });
  });

  it("is idempotent: a second sign-in changes nothing", async () => {
    store.set("users/u1", darsDoc());
    await adoptDarsUser("u1");
    const first = structuredClone(store.get("users/u1"));
    await loadUserForSession("u1");
    expect(store.get("users/u1")).toEqual(first);
  });

  it("picks a different username when the email local part is taken", async () => {
    store.set("users/u1", darsDoc());
    store.set("usernames/ada", { uid: "someone-else" });
    await adoptDarsUser("u1");
    const name = store.get("users/u1")!.username as string;
    expect(name).not.toBe("ada");
    expect(name.startsWith("ada")).toBe(true);
    expect(store.get(`usernames/${name}`)).toEqual({ uid: "u1" });
  });

  it("does not steal an admission number already indexed to another user", async () => {
    store.set("users/u1", darsDoc());
    store.set("admissionNumbers/2024134106", { uid: "other" });
    await adoptDarsUser("u1");
    expect(store.get("users/u1")).toMatchObject({ admissionNumber: null, admissionStatus: "AWAITING", regNumber: "2024134106" });
    expect(store.get("admissionNumbers/2024134106")).toEqual({ uid: "other" });
  });

  it("keeps the stored role STUDENT for a DARS admin, who still resolves to ADMIN", async () => {
    store.set("users/u1", darsDoc({ admin: true, scope: "super", regNumber: undefined }));
    const u = (await loadUserForSession("u1"))!;
    expect(store.get("users/u1")!.role).toBe("STUDENT");
    expect(resolveRole(u)).toBe("ADMIN");
    store.set("users/u1", { ...store.get("users/u1")!, admin: false }); // DARS demotes them
    expect(resolveRole((await loadUserForSession("u1"))!)).toBe("STUDENT");
  });

  it("leaves an NPS-native account alone and returns null when no profile exists", async () => {
    store.set("users/n1", { uid: "n1", role: "STAFF", fullName: "Sam" });
    expect(await loadUserForSession("n1")).toMatchObject({ role: "STAFF" });
    expect(store.size).toBe(1);
    expect(await loadUserForSession("ghost")).toBeNull();
  });
});
