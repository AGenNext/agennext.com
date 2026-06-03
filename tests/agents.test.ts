import { describe, expect, it } from "vitest";
import { shortestPath, neighborhood, degrees, buildAdjacency } from "@/lib/graph/algorithms";
import { research } from "@/lib/agents/research";
import { iri, type Edge, type GraphNode } from "@/lib/protocol";

const edges: Edge[] = [
  { from: iri("a"), property: "knows", to: iri("b") },
  { from: iri("b"), property: "knows", to: iri("c") },
  { from: iri("c"), property: "knows", to: iri("d") },
  { from: iri("a"), property: "knows", to: iri("d") }, // shortcut a-d
];

describe("graph algorithms (route problems)", () => {
  it("finds the shortest path (BFS)", () => {
    const path = shortestPath(edges, iri("a"), iri("c"));
    expect(path?.map((h) => h.to)).toEqual([iri("b"), iri("c")]);
  });

  it("treats the graph as undirected", () => {
    const path = shortestPath(edges, iri("d"), iri("a"));
    expect(path).toHaveLength(1); // d-a is a direct edge
  });

  it("returns null when disconnected", () => {
    expect(shortestPath(edges, iri("a"), iri("zzz"))).toBeNull();
  });

  it("computes bounded neighborhoods and degree centrality", () => {
    const near = neighborhood(edges, iri("a"), 1);
    expect([...near.keys()].sort()).toEqual([iri("b"), iri("d")]);
    expect(degrees(edges).get(iri("a"))).toBe(2);
    expect(buildAdjacency(edges).get(iri("a"))).toHaveLength(2);
  });
});

describe("research agent", () => {
  const nodes: GraphNode[] = [
    { "@id": iri("org"), "@type": "Organization", name: "Acme", description: "A co.", founder: { "@id": iri("ada") } },
    { "@id": iri("ada"), "@type": "Person", name: "Ada", worksFor: { "@id": iri("org") } },
    { "@id": iri("site"), "@type": "WebSite", name: "acme.example", publisher: { "@id": iri("org") } },
  ];
  const snap = {
    nodes,
    edges: [
      { from: iri("org"), property: "founder", to: iri("ada") },
      { from: iri("ada"), property: "worksFor", to: iri("org") },
      { from: iri("site"), property: "publisher", to: iri("org") },
    ] as Edge[],
  };

  it("produces a brief with related entities and a markdown summary", () => {
    const brief = research(snap, iri("org"), 2);
    expect(brief.subject.label).toBe("Acme");
    expect(brief.related.map((r) => r.label).sort()).toContain("Ada");
    expect(brief.markdown).toContain("# Research brief: Acme");
    expect(brief.hubs[0].label).toBe("Acme"); // most-connected hub
  });

  it("throws for an unknown subject", () => {
    expect(() => research(snap, iri("ghost"))).toThrow();
  });
});
