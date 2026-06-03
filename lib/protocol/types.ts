/**
 * Protocol-first type definitions.
 *
 * These types are the wire contract for the AGenNext data fabric. They are
 * deliberately schema.org/JSON-LD shaped: a node is a `Thing`, edges are
 * just reference-valued properties, and queries speak in schema.org types.
 */

/** Semantic version of the wire protocol. Surfaced on every response. */
export const PROTOCOL_VERSION = "agennext/1.0" as const;

/** A JSON-LD reference to another node, e.g. `{ "@id": "..." }`. */
export interface Reference {
  "@id": string;
}

/** A single property value: literal, reference, or a list of either. */
export type PropertyValue =
  | string
  | number
  | boolean
  | Reference
  | Array<string | number | boolean | Reference>;

/**
 * A graph node — a schema.org `Thing`. `@id` is a stable IRI and `@type`
 * is one or more schema.org type names. Everything else is a property
 * drawn from the schema.org vocabulary.
 */
export interface GraphNode {
  "@id": string;
  "@type": string | string[];
  [property: string]: PropertyValue | undefined;
}

/** A directed edge, derived from a reference-valued property. */
export interface Edge {
  from: string;
  /** schema.org property name carrying the relationship. */
  property: string;
  to: string;
}

/** A query against the fabric. All fields are optional and AND-combined. */
export interface Query {
  /** Restrict to nodes carrying this schema.org `@type`. */
  type?: string;
  /** Case-insensitive substring match over `name`/`description`. */
  text?: string;
  /** Restrict to these specific node IRIs. */
  ids?: string[];
  limit?: number;
  offset?: number;
}

/** Envelope wrapping every protocol response. */
export interface Envelope<T> {
  protocol: typeof PROTOCOL_VERSION;
  "@context": unknown;
  data: T;
}

/** Result of a {@link Query}. */
export interface QueryResult {
  items: GraphNode[];
  total: number;
}

/** A resolved node together with its immediate neighbourhood. */
export interface NodeResult {
  node: GraphNode;
  outgoing: Edge[];
  incoming: Edge[];
}

/** Health signal reported by a connector or the fabric as a whole. */
export interface Health {
  status: "ok" | "degraded" | "down";
  detail?: string;
  nodes?: number;
}

/* ------------------------------------------------------------------ *
 * Property helpers — strict-mode friendly readers over PropertyValue.
 * ------------------------------------------------------------------ */

export function getTypes(node: GraphNode): string[] {
  const t = node["@type"];
  return Array.isArray(t) ? t : [t];
}

export function isReference(v: unknown): v is Reference {
  return typeof v === "object" && v !== null && "@id" in v;
}

/** First string value of a property, if it is a literal string. */
export function getString(node: GraphNode, prop: string): string | undefined {
  const v = node[prop];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const first = v.find((x) => typeof x === "string");
    if (typeof first === "string") return first;
  }
  return undefined;
}

/** Best human label for a node. */
export function labelOf(node: GraphNode): string {
  return (
    getString(node, "name") ??
    getString(node, "headline") ??
    getString(node, "legalName") ??
    node["@id"]
  );
}
