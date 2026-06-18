import { beforeEach, describe, expect, it } from "vitest";
import { DataFabric } from "@/lib/fabric";
import { MemoryConnector } from "@/lib/fabric/connectors/memory";
import { iri, type GraphNode } from "@/lib/protocol";
import { parseSpiffeId } from "@/lib/security/spiffe";

const WRITER = { id: parseSpiffeId("spiffe://agennext.com/api/fabric/writer"), via: "header" as const };
const READER = { id: parseSpiffeId("spiffe://agennext.com/svc/reader"), via: "header" as const };

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

  it("reflects writes in the cached incoming-edge index", async () => {
    process.env.FLAG_WRITE_API = "true";
    const f = fabric();
    expect((await f.node(iri("org")))!.incoming).toHaveLength(2);
    // A new node referencing org must appear in incoming after the write
    // invalidates the index.
    await f.upsert(
      { "@id": iri("sponsor"), "@type": "Organization", name: "S", sponsor: { "@id": iri("org") } },
      WRITER,
    );
    expect((await f.node(iri("org")))!.incoming.map((e) => e.property).sort()).toEqual([
      "publisher",
      "sponsor",
      "worksFor",
    ]);
    delete process.env.FLAG_WRITE_API;
  });

  describe("write path", () => {
    beforeEach(() => {
      delete process.env.FLAG_WRITE_API;
    });

    it("blocks upsert when the write flag is off", async () => {
      await expect(fabric().upsert(seed[0], WRITER)).rejects.toThrow(/disabled/);
    });

    it("allows an authorized writer to upsert when the write flag is on", async () => {
      process.env.FLAG_WRITE_API = "true";
      const f = fabric();
      const node: GraphNode = { "@id": iri("new"), "@type": "Thing", name: "New" };
      await expect(f.upsert(node, WRITER)).resolves.toMatchObject({ "@id": iri("new") });
      expect((await f.query({ ids: [iri("new")] })).total).toBe(1);
    });

    it("rejects anonymous writes (401) and under-privileged writes (403)", async () => {
      process.env.FLAG_WRITE_API = "true";
      const node: GraphNode = { "@id": iri("nope"), "@type": "Thing", name: "Nope" };
      await expect(fabric().upsert(node, null)).rejects.toMatchObject({ status: 401 });
      await expect(fabric().upsert(node, READER)).rejects.toMatchObject({ status: 403 });
    });
  });
});
