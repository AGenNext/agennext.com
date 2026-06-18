import type { GraphNode, Health, Query } from "@/lib/protocol";

/**
 * A Connector is a schemaless source of schema.org nodes.
 *
 * The contract is intentionally document-oriented (not table/column) so that
 * schemaless multi-model stores — SurrealDB, document DBs, REST APIs — adapt
 * with no impedance mismatch. A connector only needs to hand back JSON-LD
 * `Thing`s; the fabric handles unification, edges, and the protocol envelope.
 */
export interface Connector {
  /** Stable identifier, e.g. "memory" or "surreal". */
  readonly id: string;
  readonly name: string;
  /** Whether this connector accepts writes. Read-only sources return false. */
  readonly writable: boolean;

  /** Return nodes matching the query. May be sync or async. */
  list(query: Query): Promise<GraphNode[]>;
  /** Resolve a single node by IRI, or null if absent here. */
  get(id: string): Promise<GraphNode | null>;
  /** Upsert a node. Optional; throw if {@link writable} is false. */
  upsert?(node: GraphNode): Promise<GraphNode>;
  /** Liveness/readiness of the underlying source. */
  health(): Promise<Health>;
}

/** Case-insensitive substring + type filtering shared by connectors. */
export function matches(node: GraphNode, query: Query): boolean {
  if (query.ids && !query.ids.includes(node["@id"])) return false;
  if (query.type) {
    const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
    if (!types.includes(query.type)) return false;
  }
  if (query.text) {
    const hay = [node["name"], node["description"], node["headline"]]
      .filter((v): v is string => typeof v === "string")
      .join(" ")
      .toLowerCase();
    if (!hay.includes(query.text.toLowerCase())) return false;
  }
  return true;
}
