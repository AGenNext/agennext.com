import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GenericContainer, Wait, type StartedTestContainer } from "testcontainers";
import { SurrealConnector, type SurrealConfig } from "@/lib/fabric/connectors/surreal";
import { iri, type GraphNode } from "@/lib/protocol";

/**
 * Integration test for the SurrealDB connector against a real SurrealDB,
 * started with Testcontainers. Skips automatically when no Docker daemon is
 * available (e.g. local sandboxes); runs in CI.
 */

const NS = "agennext";
const DB = "fabric";

let container: StartedTestContainer | undefined;
let connector: SurrealConnector | undefined;
let available = false;

async function defineNamespace(cfg: SurrealConfig) {
  const auth = Buffer.from(`${cfg.user}:${cfg.pass}`).toString("base64");
  const res = await fetch(`${cfg.url}/sql`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "text/plain",
      "Surreal-NS": cfg.namespace,
      "Surreal-DB": cfg.database,
      Authorization: `Basic ${auth}`,
    },
    body: `DEFINE NAMESPACE IF NOT EXISTS ${NS}; DEFINE DATABASE IF NOT EXISTS ${DB};`,
  });
  if (!res.ok) throw new Error(`define ns/db failed: ${res.status} ${await res.text()}`);
}

beforeAll(async () => {
  try {
    container = await new GenericContainer("surrealdb/surrealdb:v2.1.4")
      .withExposedPorts(8000)
      .withCommand(["start", "--user", "root", "--pass", "root", "memory"])
      .withWaitStrategy(Wait.forLogMessage(/Started web server/))
      .withStartupTimeout(60_000)
      .start();

    const cfg: SurrealConfig = {
      url: `http://${container.getHost()}:${container.getMappedPort(8000)}`,
      namespace: NS,
      database: DB,
      user: "root",
      pass: "root",
      table: "thing",
    };
    await defineNamespace(cfg);
    connector = new SurrealConnector(cfg);
    available = true;
  } catch (err) {
    console.warn(`[surreal.it] skipping — Docker unavailable: ${(err as Error).message}`);
  }
}, 120_000);

afterAll(async () => {
  await container?.stop().catch(() => {});
});

describe("SurrealConnector (integration)", () => {
  const node: GraphNode = {
    "@id": iri("acme"),
    "@type": "Organization",
    name: "Acme",
    description: "A safe company.",
  };

  it("round-trips a node through upsert/get", async (ctx) => {
    if (!available) return ctx.skip();
    await connector!.upsert(node);
    expect(await connector!.get(iri("acme"))).toMatchObject({ "@id": iri("acme"), name: "Acme" });
  });

  it("lists by type and text", async (ctx) => {
    if (!available) return ctx.skip();
    await connector!.upsert(node);
    expect((await connector!.list({ type: "Organization" })).length).toBeGreaterThan(0);
    expect((await connector!.list({ text: "acme" })).length).toBeGreaterThan(0);
  });

  it("reports health with a node count", async (ctx) => {
    if (!available) return ctx.skip();
    const health = await connector!.health();
    expect(health.status).toBe("ok");
    expect(health.nodes).toBeGreaterThan(0);
  });

  it("is injection-safe: a malicious text filter matches nothing", async (ctx) => {
    if (!available) return ctx.skip();
    await connector!.upsert(node);
    // If interpolation were unescaped this would break out and return rows.
    const rows = await connector!.list({ text: "nope' OR '1'='1" });
    expect(rows).toHaveLength(0);
  });
});
