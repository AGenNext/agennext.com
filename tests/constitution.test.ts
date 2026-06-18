import { describe, expect, it } from "vitest";
import { CONSTITUTION } from "@/lib/agents/constitution";

describe("agent constitution", () => {
  it("has a version, preamble, and articles", () => {
    expect(CONSTITUTION.version).toBe("1.0");
    expect(CONSTITUTION.preamble.length).toBeGreaterThan(0);
    expect(CONSTITUTION.articles).toHaveLength(10);
  });

  it("numbers articles sequentially and pairs each with enforcement", () => {
    CONSTITUTION.articles.forEach((a, i) => {
      expect(a.id).toBe(i + 1);
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.principle.length).toBeGreaterThan(0);
      expect(a.enforcement.length).toBeGreaterThan(0);
    });
  });
});
