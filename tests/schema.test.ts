import { describe, expect, it } from "vitest";
import {
  ancestry,
  isA,
  typeIri,
  typeDef,
  propertyDef,
  propertiesForType,
  subtypesOf,
  vocabularyStats,
  EDGE_PROPERTIES,
} from "@/lib/schema/org";

describe("schema.org type system (full vocabulary)", () => {
  it("loads the whole meta-model with acceptable counts", () => {
    const { classes, properties } = vocabularyStats();
    expect(classes).toBeGreaterThan(500);
    expect(properties).toBeGreaterThan(800);
  });

  it("walks the ancestry chain up to Thing", () => {
    expect(ancestry("WebSite")).toEqual(["WebSite", "CreativeWork", "Thing"]);
  });

  it("resolves deep multi-level inheritance", () => {
    // Restaurant -> FoodEstablishment -> LocalBusiness -> Organization/Place -> Thing
    expect(isA("Restaurant", "Organization")).toBe(true);
    expect(isA("Restaurant", "Thing")).toBe(true);
    expect(isA("WebSite", "Person")).toBe(false);
  });

  it("exposes property domain and range edges", () => {
    const founder = propertyDef("founder");
    expect(founder?.domain).toContain("Organization");
    expect(founder?.range).toContain("Person");
  });

  it("derives applicable properties via the type hierarchy", () => {
    // `name` is defined on Thing, so every type inherits it.
    expect(propertiesForType("Organization")).toContain("name");
    expect(propertiesForType("Organization")).toContain("founder");
  });

  it("knows subtypes and curated edge properties", () => {
    expect(subtypesOf("Organization")).toContain("EducationalOrganization");
    expect(typeDef("Organization")?.parent).toBe("Thing");
    expect(typeIri("Organization")).toBe("https://schema.org/Organization");
    expect(EDGE_PROPERTIES.has("founder")).toBe(true);
    expect(EDGE_PROPERTIES.has("name")).toBe(false);
  });
});
