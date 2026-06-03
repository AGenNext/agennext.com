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

/**
 * Render a value as a safe SurrealQL string literal. JSON.stringify emits a
 * double-quoted, fully-escaped string (SurrealDB accepts double-quoted
 * strings), which closes the injection vector of naive single-quoting.
 */
function lit(value: string): string {
  return JSON.stringify(String(value));
}

/** Coerce to a safe, non-negative integer for LIMIT/START clauses. */
function int(value: number): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export class SurrealConnector implements Connector {
  readonly id = "surreal";
  readonly name = "SurrealDB";
  readonly writable = true;

  /** Validated table identifier — never interpolate an unchecked one. */
  private readonly table: string;

  constructor(private cfg: SurrealConfig) {
    const table = cfg.table ?? "thing";
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
      throw new Error(`Unsafe SurrealDB table identifier: ${table}`);
    }
    this.table = table;
  }

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
    if (query.type) where.push(`${lit(query.type)} IN type`);
    if (query.text) {
      where.push(`string::lowercase(name ?? '') CONTAINS string::lowercase(${lit(query.text)})`);
    }
    const clause = where.length ? ` WHERE ${where.join(" AND ")}` : "";
    const limit = query.limit ? ` LIMIT ${int(query.limit)}` : "";
    const start = query.offset ? ` START ${int(query.offset)}` : "";
    return this.sql<GraphNode>(`SELECT * FROM ${this.table}${clause}${limit}${start};`);
  }

  async get(id: string): Promise<GraphNode | null> {
    const rows = await this.sql<GraphNode>(
      `SELECT * FROM ${this.table} WHERE id = ${lit(id)} LIMIT 1;`,
    );
    return rows[0] ?? null;
  }

  async upsert(node: GraphNode): Promise<GraphNode> {
    // JSON.stringify yields a fully-escaped object literal; id is escaped too.
    await this.sql(
      `UPSERT ${this.table} CONTENT ${JSON.stringify(node)} WHERE id = ${lit(node["@id"])};`,
    );
    return node;
  }

  async health(): Promise<Health> {
    try {
      const rows = await this.sql<{ c: number }>(
        `SELECT count() AS c FROM ${this.table} GROUP ALL;`,
      );
      return { status: "ok", nodes: rows[0]?.c ?? 0, detail: "surrealdb" };
    } catch (err) {
      log.warn("surreal.health.failed", { error: err instanceof Error ? err.message : String(err) });
      return { status: "down", detail: err instanceof Error ? err.message : "unreachable" };
    }
  }
}
