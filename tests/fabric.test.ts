import { beforeEach, describe, expect, it } from "vitest";
import { DataFabric } from "@/lib/fabric";
import { MemoryConnector } from "@/lib/fabric/connectors/memory";
import { iri, type GraphNode } from "@/lib/protocol";

const seed: GraphNode[] = [
  { "@id": iri("org"), "@type": "Organization", name: "Acme", founder: { "@id": iri("p") } },
  { "@id": iri("p"), "@type": "Person", name: "Ada", worksFor: { "@id": iri("org") } },
  { "@id": iri("site"), "@type": "WebSite", name: "acme.example", publisher: { "@id": iri("org") } },
];

function fabric() {
  return new DataFabric([new MemoryConnector(seed)]);
}

describe("DataFabric", () => {
  it("queries by type and text", async () => {
    expect((await fabric().query({ type: "Person" })).total).toBe(1);
    expect((await fabric().query({ text: "acme" })).total).toBe(2); // name + url-ish match
  });

  it("derives outgoing and incoming edges from schema.org refs", async () => {
    const result = await fabric().node(iri("org"));
    expect(result).not.toBeNull();
    expect(result!.outgoing.map((e) => e.property)).toContain("founder");
    // org is referenced by p.worksFor and site.publisher
    const incoming = result!.incoming.map((e) => e.property).sort();
    expect(incoming).toEqual(["publisher", "worksFor"]);
  });

  it("returns null for unknown nodes", async () => {
    expect(await fabric().node(iri("nope"))).toBeNull();
  });

  describe("write path", () => {
    beforeEach(() => {
      delete process.env.FLAG_WRITE_API;
    });

    it("blocks upsert when the write flag is off", async () => {
      await expect(fabric().upsert(seed[0])).rejects.toThrow(/disabled/);
    });

    it("allows upsert when the write flag is on", async () => {
      process.env.FLAG_WRITE_API = "true";
      const f = fabric();
      const node: GraphNode = { "@id": iri("new"), "@type": "Thing", name: "New" };
      await expect(f.upsert(node)).resolves.toMatchObject({ "@id": iri("new") });
      expect((await f.query({ ids: [iri("new")] })).total).toBe(1);
    });
  });
});
