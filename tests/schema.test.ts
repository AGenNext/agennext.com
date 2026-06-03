import { describe, expect, it } from "vitest";
import { ancestry, isA, typeIri, typeDef, EDGE_PROPERTIES } from "@/lib/schema/org";

describe("schema.org type system", () => {
  it("walks the ancestry chain up to Thing", () => {
    expect(ancestry("WebSite")).toEqual(["WebSite", "CreativeWork", "Thing"]);
  });

  it("isA respects transitive inheritance", () => {
    expect(isA("WebSite", "CreativeWork")).toBe(true);
    expect(isA("WebSite", "Thing")).toBe(true);
    expect(isA("WebSite", "Person")).toBe(false);
  });

  it("builds canonical type IRIs", () => {
    expect(typeIri("Organization")).toBe("https://schema.org/Organization");
  });

  it("knows curated types and reference-valued edge properties", () => {
    expect(typeDef("Organization")?.parent).toBe("Thing");
    expect(EDGE_PROPERTIES.has("founder")).toBe(true);
    expect(EDGE_PROPERTIES.has("name")).toBe(false);
  });
});
