import { describe, expect, it } from "vitest";
import {
  getString,
  getTypes,
  isReference,
  iri,
  labelOf,
  slugOf,
  type GraphNode,
} from "@/lib/protocol";

describe("protocol IRIs", () => {
  it("mints and resolves local slugs round-trip", () => {
    expect(slugOf(iri("agennext"))).toBe("agennext");
  });

  it("returns null for foreign IRIs", () => {
    expect(slugOf("https://example.com/x")).toBeNull();
  });
});

describe("property helpers", () => {
  const node: GraphNode = {
    "@id": iri("x"),
    "@type": ["Organization", "Thing"],
    name: "Acme",
    founder: { "@id": iri("p") },
    aliases: ["A", "B"],
  };

  it("getTypes normalizes to an array", () => {
    expect(getTypes(node)).toEqual(["Organization", "Thing"]);
    expect(getTypes({ "@id": "x", "@type": "Person" })).toEqual(["Person"]);
  });

  it("getString reads literals and first-of-array", () => {
    expect(getString(node, "name")).toBe("Acme");
    expect(getString(node, "aliases")).toBe("A");
    expect(getString(node, "founder")).toBeUndefined();
  });

  it("labelOf falls back to the IRI", () => {
    expect(labelOf(node)).toBe("Acme");
    expect(labelOf({ "@id": "urn:x", "@type": "Thing" })).toBe("urn:x");
  });

  it("isReference detects JSON-LD refs", () => {
    expect(isReference({ "@id": "x" })).toBe(true);
    expect(isReference("x")).toBe(false);
    expect(isReference(null)).toBe(false);
  });
});
