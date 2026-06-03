import { afterEach, describe, expect, it, vi } from "vitest";
import { SurrealConnector } from "@/lib/fabric/connectors/surreal";
import { iri, type GraphNode } from "@/lib/protocol";

const cfg = { url: "http://db:8000", namespace: "agennext", database: "fabric", table: "thing" };

/** Capture the SurrealQL sent to the fake HTTP /sql endpoint. */
function mockSql(rows: unknown[] = []) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: { body: string }) => {
      calls.push(init.body);
      return { ok: true, json: async () => [{ result: rows }] } as Response;
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("SurrealConnector injection hardening", () => {
  it("rejects unsafe table identifiers at construction", () => {
    expect(() => new SurrealConnector({ ...cfg, table: "thing; DROP" })).toThrow(/Unsafe/);
    expect(() => new SurrealConnector({ ...cfg, table: "1bad" })).toThrow(/Unsafe/);
  });

  it("escapes a malicious id in get()", async () => {
    const calls = mockSql([]);
    const evil = 'x" OR true; --';
    await new SurrealConnector(cfg).get(evil);
    const sql = calls[0];
    // The payload is carried as a fully-escaped JSON string literal...
    expect(sql).toContain(JSON.stringify(evil));
    // ...so the raw breakout sequence never appears unquoted.
    expect(sql).not.toContain('id = "x" OR true');
  });

  it("escapes query text and coerces pagination to integers", async () => {
    const calls = mockSql([]);
    await new SurrealConnector(cfg).list({
      text: "a' OR '1'='1",
      limit: 10 as number,
      offset: 5 as number,
    });
    const sql = calls[0];
    expect(sql).toContain(JSON.stringify("a' OR '1'='1"));
    expect(sql).toMatch(/LIMIT 10/);
    expect(sql).toMatch(/START 5/);
  });

  it("serializes upsert content as escaped JSON", async () => {
    const calls = mockSql([]);
    const node: GraphNode = { "@id": iri("n"), "@type": "Thing", name: 'evil " value' };
    await new SurrealConnector(cfg).upsert(node);
    expect(calls[0]).toContain(JSON.stringify(node));
  });
});
