import type { Connector } from "@/lib/fabric/connector";
import { MemoryConnector } from "@/lib/fabric/connectors/memory";
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
      // Incoming edges require scanning the graph; cheap at this scale.
      const all = (await this.query({})).items;
      const incoming: Edge[] = [];
      for (const other of all) {
        if (other["@id"] === id) continue;
        for (const e of edgesFrom(other)) {
          if (e.to === id) incoming.push(e);
        }
      }
      return { node, outgoing, incoming };
    });
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
 * Build the fabric from configuration. SurrealDB is layered in front of the
 * in-memory connector when both the OpenFeature flag and env config are
 * present; otherwise the platform runs fully in-memory with zero config.
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

  connectors.push(new MemoryConnector());
  singleton = new DataFabric(connectors);
  return singleton;
}
