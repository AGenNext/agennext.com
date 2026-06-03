import { describe, it, expect } from "vitest";
import { toBinary, fromBinary } from "@bufbuild/protobuf";
import { NodeSchema } from "@/lib/protocol/gen/agennext/v1/fabric_pb";
import { fromProtoNode, toProtoNode, toProtoQuery, fromProtoQuery } from "@/lib/protocol/proto";
import { iri, type GraphNode } from "@/lib/protocol";

const node: GraphNode = {
  "@id": iri("acme"),
  "@type": ["Organization", "CreativeWork"],
  name: "Acme",
  description: "A company.",
  founder: { "@id": iri("ada") },
  sameAs: ["https://schema.org/Organization"],
};

describe("protobuf bridge", () => {
  it("round-trips a GraphNode through protobuf (incl. binary)", () => {
    const proto = toProtoNode(node);
    // Exercise the real wire codec, not just the in-memory message.
    const back = fromProtoNode(fromBinary(NodeSchema, toBinary(NodeSchema, proto)));
    expect(back).toEqual(node);
  });

  it("collapses single-element type lists to a string", () => {
    const single: GraphNode = { "@id": iri("x"), "@type": "Thing", name: "X" };
    expect(fromProtoNode(toProtoNode(single))["@type"]).toBe("Thing");
  });

  it("round-trips a Query, dropping empty fields", () => {
    expect(fromProtoQuery(toProtoQuery({ type: "Person", limit: 5 }))).toEqual({
      type: "Person",
      limit: 5,
    });
  });
});
