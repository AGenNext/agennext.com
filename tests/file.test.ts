import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileConnector } from "@/lib/fabric/connectors/file";
import { iri, type GraphNode } from "@/lib/protocol";

const dirs: string[] = [];
function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), "agennext-file-"));
  dirs.push(d);
  return d;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const seed: GraphNode[] = [{ "@id": iri("a"), "@type": "Thing", name: "A" }];

describe("FileConnector", () => {
  it("persists writes across instances", async () => {
    const dir = tmp();
    const c1 = new FileConnector(dir, seed);
    await c1.upsert({ "@id": iri("b"), "@type": "Thing", name: "B" });

    const c2 = new FileConnector(dir, seed); // reload from disk
    expect(await c2.get(iri("b"))).toMatchObject({ name: "B" });
    expect((await c2.health()).nodes).toBe(2);
  });

  it("migrates an older on-disk document forward", async () => {
    const dir = tmp();
    // A v0 document whose node is missing @type.
    writeFileSync(
      join(dir, "graph.json"),
      JSON.stringify({ version: 0, nodes: [{ "@id": iri("c"), name: "C" }] }),
    );
    const c = new FileConnector(dir, seed);
    expect(await c.get(iri("c"))).toMatchObject({ "@type": "Thing", name: "C" });
  });
});
