import { describe, expect, it } from "vitest";
import {
  inTrustDomain,
  parseSpiffeId,
  svidFor,
  svidValid,
  workloadId,
} from "@/lib/security/spiffe";

describe("SPIFFE identity", () => {
  it("parses a valid SPIFFE ID", () => {
    const id = parseSpiffeId("spiffe://agennext.com/api/writer");
    expect(id.trustDomain).toBe("agennext.com");
    expect(id.path).toBe("/api/writer");
    expect(id.toString()).toBe("spiffe://agennext.com/api/writer");
  });

  it("rejects malformed SPIFFE IDs", () => {
    expect(() => parseSpiffeId("https://agennext.com/x")).toThrow();
    expect(() => parseSpiffeId("spiffe://")).toThrow();
  });

  it("mints workload IDs in the platform trust domain", () => {
    const id = workloadId("api/writer");
    expect(id.toString()).toBe("spiffe://agennext.com/api/writer");
    expect(inTrustDomain(id)).toBe(true);
  });

  it("issues valid, unexpired SVIDs", () => {
    expect(svidValid(svidFor("/api/writer"))).toBe(true);
    expect(svidValid({ id: workloadId("/x"), expiresAt: 0 })).toBe(false);
  });
});
