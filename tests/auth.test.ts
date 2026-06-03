import { describe, it, expect } from "vitest";
import { authenticate } from "@/lib/security/auth";
import { can, authorize, AuthzError } from "@/lib/security/authz";
import { parseSpiffeId } from "@/lib/security/spiffe";

const WRITER = "spiffe://agennext.com/api/fabric/writer";
const READER = "spiffe://agennext.com/svc/reader";

function reqWith(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/graph", { headers });
}

function jwtSvid(sub: string, ttlSeconds = 3600): string {
  const payload = Buffer.from(
    JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + ttlSeconds }),
  ).toString("base64url");
  return `header.${payload}.signature`;
}

describe("authenticate", () => {
  it("accepts a mesh-injected SPIFFE id in the trust domain", () => {
    const p = authenticate(reqWith({ "x-spiffe-id": WRITER }));
    expect(p?.id.toString()).toBe(WRITER);
    expect(p?.via).toBe("header");
  });

  it("rejects an id from a foreign trust domain", () => {
    expect(authenticate(reqWith({ "x-spiffe-id": "spiffe://evil.example/x" }))).toBeNull();
  });

  it("accepts a (mesh-verified) JWT-SVID bearer token", () => {
    const p = authenticate(reqWith({ authorization: `Bearer ${jwtSvid(READER)}` }));
    expect(p?.id.toString()).toBe(READER);
    expect(p?.via).toBe("jwt-svid");
  });

  it("ignores an expired JWT-SVID", () => {
    expect(authenticate(reqWith({ authorization: `Bearer ${jwtSvid(READER, -10)}` }))).toBeNull();
  });

  it("is anonymous when no identity is presented", () => {
    expect(authenticate(reqWith({}))).toBeNull();
  });
});

describe("authorization (ReBAC)", () => {
  const writer = { id: parseSpiffeId(WRITER), via: "header" as const };
  const reader = { id: parseSpiffeId(READER), via: "header" as const };

  it("lets a writer read and write", () => {
    expect(can(writer, "graph:read")).toBe(true);
    expect(can(writer, "graph:write")).toBe(true);
  });

  it("lets an in-domain workload read but not write", () => {
    expect(can(reader, "graph:read")).toBe(true);
    expect(can(reader, "graph:write")).toBe(false);
  });

  it("allows anonymous reads by default but never writes", () => {
    expect(can(null, "graph:read")).toBe(true);
    expect(can(null, "graph:write")).toBe(false);
  });

  it("authorize() throws 401 for anonymous writes and 403 for under-privileged ones", () => {
    expect(() => authorize(null, "graph:write")).toThrowError(AuthzError);
    try {
      authorize(null, "graph:write");
    } catch (e) {
      expect((e as AuthzError).status).toBe(401);
    }
    try {
      authorize(reader, "graph:write");
    } catch (e) {
      expect((e as AuthzError).status).toBe(403);
    }
  });
});
