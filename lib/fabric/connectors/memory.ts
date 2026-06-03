import type { Connector } from "@/lib/fabric/connector";
import { matches } from "@/lib/fabric/connector";
import { SEED } from "@/lib/fabric/seed";
import type { GraphNode, Health, Query } from "@/lib/protocol";

/**
 * Default connector: an in-memory, schemaless document store.
 *
 * It is the reference implementation of the {@link Connector} contract and
 * the zero-config default so the platform runs with no external services.
 * Its shape (an IRI -> JSON-LD document map) is deliberately identical to
 * what a schemaless store like SurrealDB returns, so swapping is seamless.
 */
export class MemoryConnector implements Connector {
  readonly id = "memory";
  readonly name = "In-Memory Graph";
  readonly writable = true;

  private store = new Map<string, GraphNode>();

  constructor(seed: GraphNode[] = SEED) {
    for (const node of seed) this.store.set(node["@id"], node);
  }

  async list(query: Query): Promise<GraphNode[]> {
    let items = [...this.store.values()].filter((n) => matches(n, query));
    const offset = query.offset ?? 0;
    const limit = query.limit ?? items.length;
    items = items.slice(offset, offset + limit);
    return items;
  }

  async get(id: string): Promise<GraphNode | null> {
    return this.store.get(id) ?? null;
  }

  async upsert(node: GraphNode): Promise<GraphNode> {
    this.store.set(node["@id"], node);
    return node;
  }

  async health(): Promise<Health> {
    return { status: "ok", nodes: this.store.size, detail: "in-memory" };
  }
}
