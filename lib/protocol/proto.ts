/**
 * Bridge between the JSON-LD `GraphNode` (the ergonomic in-process form) and
 * the generated Protocol Buffers `Node` (the cross-language wire/gRPC form).
 *
 * The `.proto` is the source of truth for the typed contract; `fabric_pb.ts`
 * is generated from it (`npm run proto:gen`). These converters let a gRPC
 * transport speak protobuf while the app keeps working in JSON-LD. protobuf-es
 * represents the `google.protobuf.Struct` property bag directly as a JSON
 * object, so no well-known-type juggling is needed.
 */
import { create, type JsonObject } from "@bufbuild/protobuf";
import {
  NodeSchema,
  QuerySchema,
  type Node as ProtoNode,
  type Query as ProtoQuery,
} from "./gen/agennext/v1/fabric_pb";
import { getTypes, type GraphNode, type Query } from "./types";

/** GraphNode → protobuf Node. Non-`@` properties become the Struct bag. */
export function toProtoNode(node: GraphNode): ProtoNode {
  const properties: JsonObject = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "@id" || key === "@type" || value === undefined) continue;
    properties[key] = value as JsonObject[string];
  }
  return create(NodeSchema, { id: node["@id"], types: getTypes(node), properties });
}

/** protobuf Node → GraphNode. Single-element type lists collapse to a string. */
export function fromProtoNode(msg: ProtoNode): GraphNode {
  const properties = (msg.properties ?? {}) as JsonObject;
  return {
    "@id": msg.id,
    "@type": msg.types.length === 1 ? msg.types[0] : msg.types,
    ...properties,
  } as GraphNode;
}

/** Query → protobuf Query. */
export function toProtoQuery(query: Query): ProtoQuery {
  return create(QuerySchema, {
    type: query.type ?? "",
    text: query.text ?? "",
    ids: query.ids ?? [],
    limit: query.limit ?? 0,
    offset: query.offset ?? 0,
  });
}

/** protobuf Query → Query (empty/zero fields are dropped). */
export function fromProtoQuery(msg: ProtoQuery): Query {
  const query: Query = {};
  if (msg.type) query.type = msg.type;
  if (msg.text) query.text = msg.text;
  if (msg.ids.length) query.ids = [...msg.ids];
  if (msg.limit) query.limit = msg.limit;
  if (msg.offset) query.offset = msg.offset;
  return query;
}
