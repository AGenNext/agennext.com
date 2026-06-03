import type { Connector } from "@/lib/fabric/connector";
import type { GraphNode, Health, Query } from "@/lib/protocol";
import { log } from "@/lib/observability";

/**
 * SurrealDB-compatible connector.
 *
 * SurrealDB is multi-model and schemaless, so our JSON-LD `Thing` documents
 * round-trip without a schema migration: each node is a record whose `id` is
 * the schema.org IRI and whose body is the document. Queries map to SurrealQL.
 *
 * This adapter speaks SurrealDB's HTTP `/sql` endpoint so it needs no native
 * driver. It is opt-in via env (`SURREAL_URL`); when unset the fabric falls
 * back to the in-memory connector. Network calls are kept behind a guarded
 * surface so the platform builds and runs without a database present.
 */
export interface SurrealConfig {
  url: string; // e.g. http://localhost:8000
  namespace: string;
  database: string;
  user?: string;
  pass?: string;
  table?: string; // defaults to "thing"
}

export function surrealConfigFromEnv(): SurrealConfig | null {
  const url = process.env.SURREAL_URL;
  if (!url) return null;
  return {
    url,
    namespace: process.env.SURREAL_NS ?? "agennext",
    database: process.env.SURREAL_DB ?? "fabric",
    user: process.env.SURREAL_USER,
    pass: process.env.SURREAL_PASS,
    table: process.env.SURREAL_TABLE ?? "thing",
  };
}

export class SurrealConnector implements Connector {
  readonly id = "surreal";
  readonly name = "SurrealDB";
  readonly writable = true;

  constructor(private cfg: SurrealConfig) {}

  private async sql<T>(query: string): Promise<T[]> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "text/plain",
      "Surreal-NS": this.cfg.namespace,
      "Surreal-DB": this.cfg.database,
    };
    if (this.cfg.user && this.cfg.pass) {
      const basic = Buffer.from(`${this.cfg.user}:${this.cfg.pass}`).toString("base64");
      headers.Authorization = `Basic ${basic}`;
    }
    const res = await fetch(`${this.cfg.url}/sql`, {
      method: "POST",
      headers,
      body: query,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`SurrealDB ${res.status}: ${await res.text()}`);
    const payload = (await res.json()) as Array<{ result: T[] }>;
    return payload.at(-1)?.result ?? [];
  }

  async list(query: Query): Promise<GraphNode[]> {
    const where: string[] = [];
    if (query.type) where.push(`'${query.type}' IN type`);
    if (query.text) where.push(`string::lowercase(name ?? '') CONTAINS string::lowercase('${query.text}')`);
    const clause = where.length ? ` WHERE ${where.join(" AND ")}` : "";
    const limit = query.limit ? ` LIMIT ${query.limit}` : "";
    const start = query.offset ? ` START ${query.offset}` : "";
    return this.sql<GraphNode>(`SELECT * FROM ${this.cfg.table}${clause}${limit}${start};`);
  }

  async get(id: string): Promise<GraphNode | null> {
    const rows = await this.sql<GraphNode>(
      `SELECT * FROM ${this.cfg.table} WHERE id = '${id}' LIMIT 1;`,
    );
    return rows[0] ?? null;
  }

  async upsert(node: GraphNode): Promise<GraphNode> {
    await this.sql(
      `UPSERT ${this.cfg.table} CONTENT ${JSON.stringify(node)} WHERE id = '${node["@id"]}';`,
    );
    return node;
  }

  async health(): Promise<Health> {
    try {
      const rows = await this.sql<{ c: number }>(
        `SELECT count() AS c FROM ${this.cfg.table} GROUP ALL;`,
      );
      return { status: "ok", nodes: rows[0]?.c ?? 0, detail: "surrealdb" };
    } catch (err) {
      log.warn("surreal.health.failed", { error: err instanceof Error ? err.message : String(err) });
      return { status: "down", detail: err instanceof Error ? err.message : "unreachable" };
    }
  }
}
