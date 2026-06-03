import { describe, expect, it } from "vitest";
import { HeuristicExtractor } from "@/lib/ai/extract";
import { getTypes, labelOf, slugOf } from "@/lib/protocol";

describe("HeuristicExtractor (offline default)", () => {
  const extractor = new HeuristicExtractor();

  it("turns text into a typed schema.org node", async () => {
    const [node] = await extractor.extract(
      "Acme Robotics\nA company building autonomous warehouse robots.",
      "Organization",
    );
    expect(getTypes(node)).toEqual(["Organization"]);
    expect(labelOf(node)).toBe("Acme Robotics");
    expect(slugOf(node["@id"])).toBe("acme-robotics");
    expect(node.description).toMatch(/warehouse robots/);
  });

  it("defaults the type to Thing and ignores empty input", async () => {
    expect((await extractor.extract("Just a name"))[0]["@type"]).toBe("Thing");
    expect(await extractor.extract("   ")).toEqual([]);
  });
});
