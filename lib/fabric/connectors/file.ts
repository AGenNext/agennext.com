import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Connector } from "@/lib/fabric/connector";
import { matches } from "@/lib/fabric/connector";
import { SEED } from "@/lib/fabric/seed";
import type { GraphNode, Health, Query } from "@/lib/protocol";
import { log } from "@/lib/observability";

/**
 * Durable, dependency-free connector: a write-through JSON document store on
 * the local filesystem. This is the default persistence path — point
 * `DATA_DIR` at a mounted volume and the graph survives restarts with no
 * external database. SurrealDB remains the option for scale/concurrency.
 *
 * The on-disk document is versioned and migrated forward on load, so the
 * schema can evolve without manual data surgery.
 */

interface StoreDoc {
  version: number;
  nodes: GraphNode[];
}

/** Current on-disk schema version. Bump when adding a migration. */
const CURRENT_VERSION = 1;

/**
 * Ordered migrations applied to bring an older document up to date. Index i
 * migrates a document at version i -> i+1.
 */
const MIGRATIONS: Array<(doc: StoreDoc) => StoreDoc> = [
  // v0 -> v1: ensure every node carries an explicit @type.
  (doc) => ({
    version: 1,
    nodes: doc.nodes.map((n) => (n["@type"] ? n : { ...n, "@type": "Thing" })),
  }),
];

function migrate(doc: StoreDoc): StoreDoc {
  let current = doc;
  while (current.version < CURRENT_VERSION) {
    current = MIGRATIONS[current.version](current);
  }
  return current;
}

export class FileConnector implements Connector {
  readonly id = "file";
  readonly name = "File Store";
  readonly writable = true;

  private readonly path: string;
  private store = new Map<string, GraphNode>();

  constructor(dir: string, seed: GraphNode[] = SEED) {
    this.path = join(dir, "graph.json");
    mkdirSync(dirname(this.path), { recursive: true });

    if (existsSync(this.path)) {
      const raw = JSON.parse(readFileSync(this.path, "utf8")) as StoreDoc;
      const migrated = migrate(raw);
      for (const node of migrated.nodes) this.store.set(node["@id"], node);
      if (migrated.version !== raw.version) {
        log.info("file.migrated", { from: raw.version, to: migrated.version });
        this.flush();
      }
    } else {
      for (const node of seed) this.store.set(node["@id"], node);
      this.flush();
      log.info("file.seeded", { path: this.path, nodes: this.store.size });
    }
  }

  /** Atomically persist the whole store (temp file + rename). */
  private flush(): void {
    const doc: StoreDoc = { version: CURRENT_VERSION, nodes: [...this.store.values()] };
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(doc));
    renameSync(tmp, this.path);
  }

  async list(query: Query): Promise<GraphNode[]> {
    let items = [...this.store.values()].filter((n) => matches(n, query));
    const offset = query.offset ?? 0;
    items = items.slice(offset, offset + (query.limit ?? items.length));
    return items;
  }

  async get(id: string): Promise<GraphNode | null> {
    return this.store.get(id) ?? null;
  }

  async upsert(node: GraphNode): Promise<GraphNode> {
    this.store.set(node["@id"], node);
    this.flush();
    return node;
  }

  async health(): Promise<Health> {
    return { status: "ok", nodes: this.store.size, detail: `file:${this.path}` };
  }
}
