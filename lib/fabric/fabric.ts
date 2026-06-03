import type { Connector } from "@/lib/fabric/connector";
import { MemoryConnector } from "@/lib/fabric/connectors/memory";
import { FileConnector } from "@/lib/fabric/connectors/file";
import { SurrealConnector, surrealConfigFromEnv } from "@/lib/fabric/connectors/surreal";
import { EDGE_PROPERTIES } from "@/lib/schema/org";
import { flags, FLAGS } from "@/lib/flags";
import { log, metrics, span } from "@/lib/observability";
import type { Principal } from "@/lib/security/auth";
import { authorize, AuthzError } from "@/lib/security/authz";
import {
  isReference,
  type Edge,
  type GraphNode,
  type Health,
  type NodeResult,
  type Query,
  type QueryResult,
} from "@/lib/protocol";

/**
 * The DataFabric unifies one or more schemaless connectors into a single
 * Schema.org graph and is the only object the API/UI talk to.
 *
 * Responsibilities: fan queries across connectors, dedupe by IRI, derive
 * edges from reference-valued schema.org properties, enforce write identity
 * (SPIFFE), respect feature flags, and emit OTel-shaped telemetry.
 */
export class DataFabric {
  private connectors: Connector[];
  /** Bumped on every write to invalidate the incoming-edge index. */
  private mutationVersion = 0;
  private index: { version: number; incoming: Map<string, Edge[]> } | null = null;

  constructor(connectors: Connector[]) {
    this.connectors = connectors;
  }

  connectorInfo() {
    return this.connectors.map((c) => ({ id: c.id, name: c.name, writable: c.writable }));
  }

  async query(query: Query): Promise<QueryResult> {
    return span("fabric.query", async () => {
      const seen = new Map<string, GraphNode>();
      for (const c of this.connectors) {
        for (const node of await c.list(query)) {
          // First connector wins on IRI collision (priority order).
          if (!seen.has(node["@id"])) seen.set(node["@id"], node);
        }
      }
      const items = [...seen.values()];
      metrics.counter("agennext_fabric_query_total", "Fabric queries served", {
        type: query.type ?? "*",
      });
      return { items, total: items.length };
    });
  }

  async node(id: string): Promise<NodeResult | null> {
    return span("fabric.node", async () => {
      let node: GraphNode | null = null;
      for (const c of this.connectors) {
        node = await c.get(id);
        if (node) break;
      }
      if (!node) return null;

      const outgoing = edgesFrom(node);
      // Incoming edges come from a cached adjacency index (O(degree) lookup)
      // instead of rescanning the whole graph on every request.
      const incoming = (await this.incomingIndex()).get(id) ?? [];
      return { node, outgoing, incoming };
    });
  }

  /**
   * Build (once) and reuse an id -> incoming-edges index. Invalidated whenever
   * a write goes through {@link upsert} (bumping `mutationVersion`), so reads
   * after a write rebuild lazily. Correct for writes made through the fabric;
   * external direct mutations of a connector are out of scope for the cache.
   */
  private async incomingIndex(): Promise<Map<string, Edge[]>> {
    if (this.index && this.index.version === this.mutationVersion) return this.index.incoming;
    const incoming = new Map<string, Edge[]>();
    for (const n of (await this.query({})).items) {
      for (const e of edgesFrom(n)) {
        const list = incoming.get(e.to);
        if (list) list.push(e);
        else incoming.set(e.to, [e]);
      }
    }
    this.index = { version: this.mutationVersion, incoming };
    return incoming;
  }

  async upsert(node: GraphNode, principal: Principal | null): Promise<GraphNode> {
    if (!flags.boolean(FLAGS.WRITE_API, false)) {
      throw new AuthzError("Write API disabled (enable flag write-api).", 403);
    }
    // SPIFFE identity + Permify-style authorization gate every write.
    authorize(principal, "graph:write");
    const target = this.connectors.find((c) => c.writable && c.upsert);
    if (!target?.upsert) throw new Error("No writable connector available.");
    return span(
      "fabric.upsert",
      async () => {
        const saved = await target.upsert!(node);
        this.mutationVersion++; // invalidate the incoming-edge index
        log.info("fabric.upsert", {
          id: saved["@id"],
          by: principal!.id.toString(),
          via: principal!.via,
          connector: target.id,
        });
        metrics.counter("agennext_fabric_upsert_total", "Nodes written via fabric", {
          connector: target.id,
        });
        return saved;
      },
    );
  }

  async health(): Promise<{ status: Health["status"]; connectors: Array<{ id: string } & Health> }> {
    const reports = await Promise.all(
      this.connectors.map(async (c) => ({ id: c.id, ...(await c.health()) })),
    );
    const status: Health["status"] = reports.every((r) => r.status === "ok")
      ? "ok"
      : reports.some((r) => r.status === "ok")
        ? "degraded"
        : "down";
    return { status, connectors: reports };
  }
}

/** Derive outgoing edges from a node's reference-valued schema.org props. */
function edgesFrom(node: GraphNode): Edge[] {
  const edges: Edge[] = [];
  for (const [prop, value] of Object.entries(node)) {
    if (prop.startsWith("@")) continue;
    if (!EDGE_PROPERTIES.has(prop)) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      if (isReference(v)) edges.push({ from: node["@id"], property: prop, to: v["@id"] });
    }
  }
  return edges;
}

/* -------------------- singleton wiring (per process) -------------------- */

let singleton: DataFabric | null = null;

/**
 * Build the fabric from configuration. Connector precedence:
 *   1. SurrealDB — when its OpenFeature flag + connection env are present.
 *   2. A durable store — the default. A file store persists to `DATA_DIR`
 *      (defaults to `.data`) so the graph survives restarts; set
 *      `DATA_STORE=memory` (or run under Vitest) for an ephemeral in-memory
 *      store with zero filesystem writes.
 */
export function getFabric(): DataFabric {
  if (singleton) return singleton;
  const connectors: Connector[] = [];

  if (flags.boolean(FLAGS.SURREAL_CONNECTOR, false)) {
    const cfg = surrealConfigFromEnv();
    if (cfg) {
      connectors.push(new SurrealConnector(cfg));
      log.info("fabric.connector.enabled", { connector: "surreal", url: cfg.url });
    } else {
      log.warn("fabric.connector.skipped", { connector: "surreal", reason: "SURREAL_URL unset" });
    }
  }

  const ephemeral = process.env.DATA_STORE === "memory" || !!process.env.VITEST;
  if (ephemeral) {
    connectors.push(new MemoryConnector());
  } else {
    const dir = process.env.DATA_DIR ?? ".data";
    connectors.push(new FileConnector(dir));
    log.info("fabric.connector.enabled", { connector: "file", dir });
  }

  singleton = new DataFabric(connectors);
  return singleton;
}
