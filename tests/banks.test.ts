import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { dedupeBanks } from "@/lib/server/banks";

describe("dedupeBanks", () => {
  it("keeps one bank per code and sorts by name", () => {
    const out = dedupeBanks([
      { name: "Zenith Bank", code: "057" },
      { name: "Access Bank", code: "044" },
      { name: "Zenith Bank (alt)", code: "057" },
      { name: "", code: "" },
    ]);
    expect(out).toEqual([{ name: "Access Bank", code: "044" }, { name: "Zenith Bank", code: "057" }]);
  });
});
